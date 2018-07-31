## koop-knoema provider
Register datasets from a Knoema datasource as a Koop provider

### Getting Started
- `git clone` this repo
- `npm install`
- create a `development.json` file under the `config` folder
- [sign up for a knoema account](https://knoema.com/sys/login/signup)
  - create an app that will give you a Client ID and a Client Secret
  - in your `config/development.json` add in your client id and client secret:
  ```
    { 
      "client_id": <your client id here>,
      "client_secret": <your client secret here>
    }
  ```
- `npm start`
- your server is now available at `http://localhost:3000/knoema`

### (optional) Deploy to Heroku
- create a `custom-enviornment-variables.json` in your `config` folder
- in `custom-enviornment-variables.json`, add:
  ```
    {
      "client_id": "CLIENT_ID",
      "client_secret": "CLIENT_SECRET"
    }
  ```
- [sign up](https://signup.heroku.com/) for a free Heroku account if you need one
- create a [Heroku NodeJS App](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction)
- go to the Heroku Dashboard for your newly created app, and set the [Config Variables](https://devcenter.heroku.com/articles/config-vars#using-the-heroku-dashboard) for `CLIENT_ID` and `CLIENT_SECRET`. 
  - set the values of these using your Knoema Client ID and Client Secret
- follow the rest of the instructions for [deploying your app to Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs#push-local-changes)


## Using the Koop Provider

### For Knoema Datasets
The URL structure to use Knoema datasets as a FeatureServer will be:

`http://<yourServerName>/knoema/<knoemaDatasetId>/<knoemaDatasetIndicatorKey>/FeatureServer/0`

This provider will also give you a helper endpoint to list out available datasets:

`http://<yourServerName>/knoema/datasets/`

Then you can get more detail for a specific dataset:

`http://<yourServerName>/knoema/datasets/<knoemaDatasetId>`

This response will include `dimensions` where you can copy/paste the `key` to serve as the `<knoemaDatasetIndicatorKey>` referenced above

A final example would look like this:

`https://<yourServerName>/knoema/bbkawjf/1000420/FeatureServer/0`

You can now use that URL in a variety of ArcGIS Online applications

### For SDG Datasets
Let's face it, there's a lot of data here and the SDGs only add more! Here are some helper URLs for dealing specifically with the SDGs datasets hosted by Knoema.

Get some metadata for each Goal or Target:

`http://<yourServerName>/knoema/sdgs/goals`

`http://<yourServerName>/knoema/sdgs/targets`

That's great, but maybe you are just interested in dropping in FeatureServer links into an ArcGIS app. Use this URL to get a listing of available links. This is, by far, the easiest way to get a direct link to a Series dataset.

Return all links: `http://<yourServerName>/knoema/sdgurls`

Return all links for a specific goal: `http://<yourServerName>/knoema/sdgurls/<goalNumber>`

For any of the `/sdgurls/` links, add a `?f=html` to see a nice html view of the data instead of the default JSON response.