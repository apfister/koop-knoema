/*
  controller.js
  This file is not required unless additional routes specified in routes.js
  If so, corresponding functions must be written to match those routes.
  Documentation: http://koopjs.github.io/docs/specs/provider/
*/

function Controller (model) {
  this.model = model;
}

Controller.prototype.getApiDetail = function (req, res) {
  this.model.getApiDetail(req, (err, resource) => {
    if (err) {
      res.status(500 || err.code).json({ error: err });
    } else {
      res.json(resource);
    }
  });
};

Controller.prototype.getDatasetDetail = function (req, res) {
  this.model.getDatasetDetail(req, (err, resource) => {
    if (err) {
      res.status(500 || err.code).json({ error: err });
    } else {
      res.json(resource);
    }
  });
};

Controller.prototype.getSdgGoalsTargets = function (req, res) {
  this.model.getSdgGoalsTargets(req, (err, resource) => {
    if (err) {
      res.status(500 || err.code).json({ error: err });
    } else {
      res.json(resource);
    }
  });
};

Controller.prototype.getSdgUrls = function (req, res) {
  this.model.getSdgUrls(req, (err, resource) => {
    if (err) {
      res.status(500 || err.code).json({ error: err });
    } else {
      if (req.query && req.query.f && req.query.f === 'html') {
        res.render('url.pug', {resource: resource});
      } else {
        res.json(resource);
      }      
    }
  });  
};

module.exports = Controller;