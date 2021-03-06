/*
  routes.js
  This file is an optional place to specify additional routes to be handled by this provider's controller
  Documentation: http://koopjs.github.io/docs/specs/provider/
*/
module.exports = [
  {
    path: '/knoema',
    methods: [ 'get', 'post' ],
    handler: 'getApiDetail'
  },
  {
    path: '/knoema/datasets/:id?',
    methods: [ 'get', 'post' ],
    handler: 'getDatasetDetail'
  },
  {
    path: '/knoema/datasets/:id/dimension/:dimensionId',
    methods: [ 'get', 'post' ],
    handler: 'getDatasetDetail'
  },
  {
    path: '/knoema/sdgs/:type',
    methods: [ 'get', 'post' ],
    handler: 'getSdgGoalsTargets'
  },
  {
    path: '/knoema/sdgurls/:filter?',
    methods: [ 'get', 'post' ],
    handler: 'getSdgUrls'
  }
];