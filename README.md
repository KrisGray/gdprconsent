[![Build Status](https://travis-ci.org/KrisGray/gdprconsent.svg)](https://travis-ci.org/KrisGray/gdprconsent)
## What is GDPR Consent? 

[GDPR consent](https://krisgray.github.io/gdprconsent) is a lightweight JavaScript plugin based on [Cookie Consent](https://cookieconsent.insites.com/) for alerting users about the privacy policy and the use of cookies within the website.

It is designed to help you comply with the EU Cookie Law and the GDPR.

## Version 1.0

Version 1.0 is based on the Cookie consent version 3.0. Noticable differences are as follows:

- CSS development now done via SASS (scss).
- Due to GDPR rules, Opt-out is not an option and so opt-out and the dismiss status are removed.
- GDPR will add two cookies rather than the one that Cookie Consent would set. This is because for anonymous browsing under GDPR we have to record the version of the Ts &amp; Cs. If the terms and conditions version changes then we will have to delete the cookies and ask for acceptance once again. The second cookies is used to store the accept privacy policy version to compare with the current version.

**Please note that if you are to use the locations service within GDPR Consent, that you add the service as a data processor within your privacy notice.**

## Documentation 

See our [full documentation](https://krisgray.github.io/gdprconsent).

## Contributing

Feel free to improve the plugin and send us a pull request.  

The easiest way to develop is to host the files with a local webserver. e.g. 

```sh
python -m SimpleHTTPServer
```

We use Gulp to compile the SCSS and minify the JavaScript. You can run a build with:

```sh
gulp build
```

## License

Code released under the [MIT licence](http://opensource.org/licenses/MIT).

## Credits

GDPR Consent v1

+ Kris Gray - JavasScript

Cookie Consent v3

+ Alex Morley-Finch - JavaScript
+ Piiu Pilt - JavaScript
+ Oliver Emberton (@oliveremberton) - a couple of lines of CSS, maybe

Cookie Consent v2

+ David Ball (@drball) - CSS / themes
+ Adam Hutchinson (@adjohu) - JavaScript
