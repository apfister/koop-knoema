const config = require('config');
const crypto = require('crypto');
const moment = require('moment');
const schedule = require('node-schedule');
const rp = require('request-promise-native');
const countryGeom = require('./data/country-geometry.json');

function Model(koop) {
  const apiUrl = `${config.baseUrl}/${config.apiVersion}`;
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

  getPivotData(datasetId, indicator, timeMembers)
    .then(response => {
      const featureSet = translate(response.data);
      featureSet.metadata = attachFeatureMetadata(response.filter[0].members[0], response.datasetName, featureSet.dateMin, featureSet.dateMax);
      callback(null, featureSet); 
    })
    .catch(error => callback(error, null));
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

  let min = moment();
  let max = moment();

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
          year: moment(itemData.Time).format('YYYY'),
          date: moment(itemData.Time).valueOf()
        },
        geometry: {
          type: 'Point',
          coordinates: getCountryGeometry(itemData.RegionId)
        }
      }
      features.push(feature);

      min = moment.min(min, moment(itemData.Time));
      max = moment.max(max, moment(itemData.Time));
    });
  });

  // console.log('time extent', min.format('YYYY'), max.format('YYYY'))
  return {features: features, dateMin:min.valueOf(), dateMax:max.valueOf()};
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
    // console.log('timeMembers', timeMembers);
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