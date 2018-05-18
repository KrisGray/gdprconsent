---
layout: default
---
## JavaScript API

### Example
This example places an informational (default) black and white popup with a yellow button inside the body of a website. Location is switched on an so this example will send the users IP to Maxmind to get the country code as assess if the user needs to see the notice based on location.

```js
  <script src="js/gdprconsent.min.js"></script>
  <script type="text/javascript">
      var GDPR_VERSION = '25-May-2018';
      window.addEventListener("load", function(){
        window.gdprconsent.initialise({
          container: document.getElementsByTagName("body"),		//Change this to the element you wish
          "GDPR_VERSION": GDPR_VERSION,
          "cookie": {
            "domain": "localhost",
            "path": "/",
            "expiryDays": 365,
          },
          "palette": {
            "popup": {
              "background": "#000"
            },
            "button": {
              "background": "#f1d600"
            }
          },
          "type": "info"
          "location": true
        });
      });
  </script>
```

### Main options

These are the main options that can be passed to the Cookie Consent tool.

`enabled` (boolean)
Default: true

This can be used to disable the popup. It is internally used to disable itself (if needed), but can be configured externally too.

`container` (HTMLElement)
Default: null

The tool is automatically appended to the HTML body. Use this option to select the parent element. Use autoOpen: false to prevent the tool automatically appending itself to any container.

### Cookie options

It is recommended to set these values to correspond with your server. You MUST set the ‘domain’ option, otherwise your cookies may not work.

`cookie.name` (string)
Default: ‘cookieconsent_status’

Name of the cookie that keeps track of users choice

`cookie.path` (string)
Default: ‘/’

URL path that the cookie ‘name’ belongs to. The cookie can only be read at this location

`cookie.domain` (string)
Default: ''<empty string>

The domain that the cookie ‘name’ belongs to. The cookie can only be read on this domain. Guide to cookie domains

`cookie.expiryDays` (integer)
Default: 365

The cookies expire date, specified in days (specify -1 for no expiry)

---
layout: default
---
## JavaScript API

### Example
This example places an informational (default) black and white popup with a yellow button inside the body of a website. Location is switched on an so this example will send the users IP to Maxmind to get the country code as assess if the user needs to see the notice based on location.

```js
  <script src="js/gdprconsent.min.js"></script>
  <script type="text/javascript">
      var GDPR_VERSION = '25-May-2018';
      window.addEventListener("load", function(){
        window.gdprconsent.initialise({
          container: document.getElementsByTagName("body"),		//Change this to the element you wish
          "GDPR_VERSION": GDPR_VERSION,
          "cookie": {
            "domain": "localhost",
            "path": "/",
            "expiryDays": 365,
          },
          "palette": {
            "popup": {
              "background": "#000"
            },
            "button": {
              "background": "#f1d600"
            }
          },
          "type": "info"
          "location": true
        });
      });
  </script>
```

###Main options

These are the main options that can be passed to the Cookie Consent tool.

`enabled` (boolean)
Default: true

This can be used to disable the popup. It is internally used to disable itself (if needed), but can be configured externally too.

`container` (HTMLElement)
Default: null

The tool is automatically appended to the HTML body. Use this option to select the parent element. Use autoOpen: false to prevent the tool automatically appending itself to any container.

###Cookie options

It is recommended to set these values to correspond with your server. You MUST set the ‘domain’ option, otherwise your cookies may not work.

`cookie.name` (string)
Default: ‘gdprconsent_status’

Name of the cookie that keeps track of users choice

`cookie.path` (string)
Default: ‘/’

URL path that the cookie ‘name’ belongs to. The cookie can only be read at this location

`cookie.domain` (string)
Default: ''<empty string>

The domain that the cookie ‘name’ belongs to. The cookie can only be read on this domain. Guide to cookie domains

`cookie.expiryDays` (integer)
Default: 365

The cookies expire date, specified in days (specify -1 for no expiry)

### Content options

Text strings used for cookie consent window elements.

`content` (object)
Defaults:
```js
content: {
  header: 'Privacy &amp; Cookie notice!',
  message: 'This website requires cookies, and the limited processing of your personal data in order to function. For more information please read our',
  allow: 'OK',
  deny: 'Decline',
  link: 'Privacy policy',
  href: 'http://cookiesandyou.com',
  close: '&#x274c;',
},
```

Overwrite these default options to change the content within the tool
