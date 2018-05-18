---
layout: default
---

# Location services

The location services are disabled by default. If you switch this on, you may need to add the service as a 'data processor' within your privacy notice since the users IP will be sent to a geolocation service such as [MAXMIND](https://www.maxmind.com/en/home) in order to get the country code.

## Architecture

GDPR Consent contains three modules named Popup, Law and Location.


- Popup can be used on it’s own regardless of it’s location, and contains any and all functionality for displaying a popup on screen.
- Law accepts the popup options and a country code. Using the country code it modifies the popup options, enabling/disabling certain functionality in order to comply with the law specified by that country
- Location is simply a tool for getting the two letter country code that the user is in.

Together, these modules: get the country code, apply the law specific to that country, and displays the popup (if necessary).

In code form, a service looks like this:
```js
{
  url: <string> The location of the service API
  isScript: <boolean>, Whether to use a script tag or a XMLHttpRequest
  data: <object>, Useful if the service requires post data
  headers: <array>, Useful for setting service specific headers
  callback: <function(done, response)>, A handler for understanding the response
}
```

The callback provides a `done` callback. If you need to make additional requests, call `done` with the country code when you’re finished. Otherwise, just return the country code.

Example:

```js
{
  url: '//example-service/script.js',
  isScript: true,
  callback: function (done, response) {
    // We just downloaded the 'script.js' which defined a third party object.
    if (!window.MyService) {
      done(new Error('The JavaScript file failed to download and define MyService'));
    }
   
    MyService.locateMe(function(response){
      done({code: response.countryCode});
    }, function(err){
      done(new Error(err));
    });
  },
}
```

## Services

In order to find the location, Cookie Consent uses third-party location services. These third-party services usually provide an API that can be accessed over the internet.

To integrate a new service, you need to define the service location, the type of request (XMLHttpRequest vs <script>) and how the tool should interpret the response.

To do this, define a new service like so:

```js
gdprconsent.initialise({
  ...popupOptions,
 
  location: {
    serviceDefinitions: {
      mynewservice: function(options) {
        return {
          url: '//example-service.com/json',
          callback: function(done, response) {
            // This function must parse the 'response' and return the country code, or fail.
            // If this function doesn't fail correctly, then the next service will not run.
            // Therefore, it's generally best to add a try {...} catch () {...} block
            try {
              var json = JSON.parse(response);
              if (json.countryCode) {
                return {code: json.countryCode}
              }
              throw 'Could not find a country code in the response';
            } catch (err) {
              return new Error('Invalid response (' + err + ')');
            }
          },
        };
      },
    },
 
    services: [
      'mynewservice'
    ]
  }
});
```

Above, you can see that we first define our service, then we use it by adding it to the `services` array. We can add it simply by passing the name of it as a string.
Some service definitions may be more complicated though, and require configuration.

To do this, you can pass an object instead:

```js
services: [
  {name:'mynewservice', mySpecialOption: 'some value', KEY: 'uUCGtoyeiH5gsm3Wn2cp9D1Z1deHcpBG8ySA4hYBcQd20Z4C6AwGKqln7mtEfGN'}
],
```

Then, when defining your service, the options are passed through like so:

```js
mynewservice: function(options) {
  // `options.mySpecialValue` and `options.KEY` now exist
  return {
    url: '//someurl.com?apiKey='+options.KEY
    // ...serviceDefinition
  };
},
```

As well as passing an object with options into the ‘services’ array, you can also pass a function that returns an object, just because. 

## Notes

Above, we integrated `options.KEY` with the url by simply appending the two string. If you’re lazy, there is an option called `interpolateUrl` which will automatically interpolate a string with the values of an object. Use it like so:

```js
serviceDefinitions: {
  mynewservice: function(options) {
    return {
      url: '//example-service.com/json?key={api_key}&someValue=1&callback={callback}&someOtherValue',
      isScript: true, // use this flag to tell the tool to download the resource as a script tag (using JSONP)
      callback: function(done, response) {
        // handle response
      },
    };
  },
},
 
services: [
  {name: 'mynewservice', interpolateUrl: {api_key: 'uUCGtoyeiH5gsm3Wn2cp9D1Z1deHcpBG8ySA4hYBcQd20Z4C6AwGKqln7mtEfGN'}},
]
```

The ‘{callback}’ string can be used in the URL to automatically write the JSONP callback. It is appended with ‘Date.now()’ to prevent global namespace collisions.