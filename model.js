const config = require('config');
const crypto = require('crypto');
const moment = require('moment');
const schedule = require('node-schedule');
const rp = require('request-promise-native');
const countryGeom = require('./data/country-geometry.json');

function Model(koop) {
  const apiUrl = `${config.baseUrl}`;
  config.apiUrl = apiUrl;

  // console.log('CONFIG ===>', config);

  const dte = moment().utc().format('DD-MM-YY-HH');
  // const dte = moment().utc().format('28-06-18-17');
  generateHash(dte);

  // run every day at midnight to refresh hash for requests
  schedule.scheduleJob('0 0 * * *', () => { 
    const dte = moment().utc().format('DD-MM-YY-HH');
    console.log(`generating new hash for date :: ${dte}`);
    generateHash(dte);
  });
}

function generateHash(dte) {
  // Knoema API reference for generating the right Authorization header: https://knoema.com/dev/apps/authentication
  const client_id = config.client_id;
  const client_secret = config.client_secret;

  // reference: https://stackoverflow.com/questions/7480158/how-do-i-use-node-js-crypto-to-create-a-hmac-sha1-hash
  // the date needs to be in GMT so use the `.utc()` method. w/o this, errors.
  // const dte = moment().utc().format('DD-MM-YY-HH');
  const hash = crypto.createHmac('sha1', dte).update(client_secret).digest('base64');
  config.authHash = `Knoema ${client_id}:${hash}:1.2`;
}

Model.prototype.getApiDetail = (req, callback) => {
  const sdgBase = `${req.protocol}://${req.get('host')}/knoema/sdgs`;

  const detail = {
    goals: {
      description: 'Use this URL to get a listing of all available detail for SDG Goals',
      url: `${req.protocol}://${req.get('host')}/knoema/sdgs/goals`
    },
    targets: {
      description: 'Use this URL to get a listing of all available detail for SDG Targets',
      url: `${req.protocol}://${req.get('host')}/knoema/sdgs/targets`
    },
    featureServerUrls: {
      description: 'Use this URL to get a listing of feature server URLs for all available indicator data. Adding an optional :goal will filter results to that goal',
      url: `${req.protocol}://${req.get('host')}/knoema/sdgurls/:goal?`
    }
  };

  callback(null, detail);
}

Model.prototype.getData = (req, callback) => {
  // console.log('req.params', req.params);
  
  const params = req.params;
  
  console.log('req.query', req.query);

  const datasetId = params.host;
  const indicator = params.id;

  let timeMembers = [];
  if (req.query.time) {
    timeMembers = getTimeMembers(req.query.time);
  }

  if (config.sdgDatasetId === datasetId) {
    const inbound = indicator.split(':');
    const goal = parseInt(inbound[0]);
    const target = parseInt(inbound[1]);

    getPivotSdgData(datasetId, goal, target, timeMembers)
      .then(response => {
        const featureSet = translate(response.data);

        const targetDescription = response.filter.filter(item => item.dimensionId === 'target')[0].members[0];
        const goalDescription = response.filter.filter(item => item.dimensionId === 'goal')[0].members[0];

        let layerName = targetDescription.substr(0, targetDescription.indexOf('. Age'));
        if (featureSet.features.length > 0) {
          const units = featureSet.features[0].properties.units;
          layerName = `${layerName} (${units})`;
        }
        const layerDescription = `${targetDescription}. ${goalDescription}`;

        featureSet.metadata = attachFeatureMetadata(layerName, layerDescription, featureSet.dateMin, featureSet.dateMax);

        callback(null, featureSet); 
      })
      .catch(error => {
        console.log(error);
        callback(error, null)
      });
  } else {

    getPivotData(datasetId, indicator, timeMembers)
      .then(response => {
        const featureSet = translate(response.data);
        featureSet.metadata = attachFeatureMetadata(response.filter[0].members[0], response.datasetName, featureSet.dateMin, featureSet.dateMax);
        callback(null, featureSet); 
      })
      .catch(error => callback(error, null));

  }
}

Model.prototype.getDatasetDetail = (req, callback) => {
  getDetail(req, callback)
    .then(response => {
      callback(null, response);
    })
    .catch(error => {
      callback(error, null);
    });  
}

function getGoalTargetMeta(type) {  
  const uri = `${config.sdgApiUrl}/meta/dataset/dlwvlne/dimension/${type}`;
  return rp({
    uri,
    method: 'GET',
    json: true
  });
}

Model.prototype.getSdgGoalsTargets = (req, callback) => {
  const type = req.params.type.substr(0,req.params.type.length-1);
  getGoalTargetMeta(type)
  .then(response => {
    callback(null, response);
  })
  .catch(error => {
    callback(error, null);
  });
};

Model.prototype.getSdgUrls = (req, callback) => {
  const base = `${req.protocol}://${req.get('host')}/knoema/${config.sdgDatasetId}`;

  getGoalTargetMeta('goal')
  .then(goals => {
    if (req.params.filter) {
      goals.items = goals.items.filter(goal => goal.fields.id.split('.')[1] === req.params.filter);
    }
    getGoalTargetMeta('target')
    .then(targets => {
      let urls = [];
      goals.items.forEach(goal => {
        const goalKey = goal.key;
        const goalId = goal.fields.id.split('.')[1];
        const foundTargets = targets.items.filter(target => target.fields.goal === goalId);

        foundTargets.forEach(ft => {
          
          const url = `${base}/${goalKey}:${ft.key}/FeatureServer/0`;
          urls.push({
            goalName: goal.name,
            targetName: ft.name,
            targetId: ft.fields.target,
            indicatorId: ft.fields.indicator,
            seriesCode: ft.fields['series-code'],
            unit: ft.fields.unit,
            source: ft.fields.source,
            featureServerUrl: url
          });
        });

      });

      callback(null, urls);
    });
  });
}

function getPivotSdgData(datasetId, goal, target, timeMembers) {
  const uri = `${config.sdgApiUrl}/data/pivot`;

  const payload = {"Dataset":"dlwvlne","Header":[{"FilterText":null,"DimensionId":"Time","Members":[],"DatasetId":"AFRSDG2016","UiMode":"allData"}],"Stub":[{"FilterText":null,"DimensionId":"country","Members":[1000100,1000000,1000010,1000020,1000030,1000040,1000050,1000060,1000070,1000080,1000090,1000110,1000120,1000130,1000140,1000150,1000160,1000170,1000180,1000190,1000200,1000210,1000220,1000230,1000240,1000250,1000260,1000270,1000280,1000290,1000300,1000310,1000320,1000330,1000340,1000350,1000360,1000370,1000390,1000400,1000410,1000420,1000430,1000440,1000450,1000460,1000470,1000480,1000490,1000500,1000510,1000520,1000530],"DatasetId":"dlwvlne"}],"Filter":[{"FilterText":null,"DimensionId":"country-target","Members":[1000000],"DatasetId":"dlwvlne"},{"FilterText":null,"DimensionId":"goal","Members":[1000070],"DatasetId":"dlwvlne"},{"FilterText":null,"DimensionId":"target","Members":[1003750],"DatasetId":"dlwvlne"}],"Frequencies":["A"],"Sort":{"Discriminator":{"Time":"*","country-target":1000000,"goal":1000070,"target":1003750},"BaseMember":{"Key":null,"Value":null},"Order":"desc","Top":1000000,"ShowOthers":false}};

  payload.Dataset = config.sdgDatasetId;
  payload.Stub[0].DatasetId = config.sdgDatasetId;
  
  payload.Filter[0].DatasetId = config.sdgDatasetId;
  payload.Filter[1].Members = [ parseInt(goal) ];
  payload.Filter[2].Members = [ parseInt(target) ];

  payload.Sort.Discriminator.goal = parseInt(goal);
  payload.Sort.Discriminator.target = parseInt(target);

  if (timeMembers.length > 0) {
    payload.Header[0].Members = timeMembers.map(t => t.toString());
    payload.Header[0].UiMode = 'individualMembers';
  }

  return rp({
    uri,
    method: 'POST',
    json: payload,
    headers: {
      'Authorization': config.authHash
    }
  });
}

function getPivotData(datasetId, indicator, timeMembers) {

  const uri = `${config.apiUrl}/data/pivot`;

  const payload = {"Dataset":"bbkawjf","Header":[{"FilterText":null,"DimensionId":"Time","Members":[],"DatasetId":"bbkawjf"}],"Stub":[{"FilterText":null,"DimensionId":"country","Members":["1000020","1000030","1000040","1000050","1000060","1000070","1000080","1000090","1000110","1000120","1000130","1000140","1000150","1000190","1000200","1000210","1000220","1000240","1000250","1000260","1000280","1000290","1000300","1000310","1000320","1000330","1000350","1000360","1000370","1000380","1000390","1000400","1000410","1000420","1000430","1000440","1000450","1000460","1000480","1000490","1000500","1000510","1000520","1000530","1000540","1000550","1000560","1000570","1000580","1000590","1000600","1000610","1000620"],"DatasetId":"bbkawjf"}],"Filter":[{"FilterText":null,"DimensionId":"indicator","Members":["1001060"],"DatasetId":"bbkawjf"}],"Frequencies":["A"],"Sort":{"Discriminator":{"Time":"*","indicator":"1001060"},"BaseMember":{"Key":null,"Value":null},"Order":"desc","Top":"1000000","ShowOthers":false},"TimeseriesAttributes":[]};

  payload.Dataset = datasetId;
  payload.Header[0].DatasetId = datasetId;
  payload.Stub[0].DatasetId = datasetId;
  
  payload.Filter[0].DatasetId = datasetId;
  payload.Filter[0].Members = [ indicator ];
  payload.Sort.Discriminator.indicator = indicator;

  if (timeMembers.length > 0) {
    payload.Header[0].Members = timeMembers;
  }

  return rp({
    uri,
    method: 'POST',
    json: payload,
    headers: {
      'Authorization': config.authHash
    }  
  });
}

function getDetail(req, callback) {
  const params = req.params;
  // console.log(params);
  
  let url = `${config.apiUrl}/meta/dataset`;

  const id = params.id;
  if (id && id !== '') {
    url = `${url}/${id}`;
  }

  const dim = params.dimensionId;
  if (dim) {
    url = `${url}/dimension/${dim}`;
  }

  // console.log(url);

  return rp({
    uri: url,
    method: 'GET',
    json: true,
    headers: {
      'Authorization': config.authHash
    }      
  });
}

function translate(input) {  
  const r = collectFeatures(input);
  return {
    type: 'FeatureCollection',
    features: r.features,
    dateMin: r.dateMin,
    dateMax: r.dateMax
  }
}

function collectFeatures (inputs) {
  features = [];

  let min = moment.utc();
  let max = moment.utc();

  inputs.forEach(timePeriod => {
    const featureData = timePeriod.columnData;
    featureData.forEach(itemData => {
      const feature = {
        type: 'Feature',
        properties: {
          value: itemData.Value,
          units: itemData.Unit,
          frequency: itemData.Frequency,
          country: itemData.country,
          indicator: itemData.indicator,
          regionId: itemData.RegionId,
          year: moment.utc(itemData.Time).format('YYYY'),
          date: moment.utc(itemData.Time).valueOf()
        },
        geometry: {
          type: 'Point',
          coordinates: getCountryGeometry(itemData.RegionId)
        }
      }
      features.push(feature);

      min = moment.min(min, moment.utc(itemData.Time));
      max = moment.max(max, moment.utc(itemData.Time));
    });
  });

  // console.log('time extent', min.format('YYYY'), max.format('YYYY'))
  const obj = {
    features: features, 
    dateMin:min.valueOf(), 
    dateMax:max.valueOf()
  };
  return obj;
}

function getTimeMembers(time) {
  let timeMembers = [];
  if (time) {
    // console.log('time', time);
    const splits = time.split(',');
    const start = parseInt(moment(parseInt(splits[0])).format('YYYY'));
    const end = parseInt(moment(parseInt(splits[1])).format('YYYY'));
    for (var i=start; i <= end;i++) {
      timeMembers.push(i);
    }
    console.log('timeMembers', timeMembers);
  }
  return timeMembers;
}

function getCountryGeometry(id) {
  return countryGeom[id] ? countryGeom[id].coordinates : [0,0];
}

function attachFeatureMetadata(name, description, dateMin, dateMax) {
  return {
    name: name,
    description: description,
    timeInfo: {
      startTimeField: 'date',
      endTimeField: null,
      trackIdField: null,
      timeExtent: [dateMin, dateMax],
      timeReference: null,
      timeInterval: 1,
      timeIntervalUnits: 'esriTimeUnitsYears',
      exportOptions: {
        useTime: true,
        timeDataCumulative: false,
        timeOffset: null,
        timeOffsetUnits: null
      }
    }
  };
}

module.exports = Model;