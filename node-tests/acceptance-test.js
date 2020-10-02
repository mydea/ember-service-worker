const expect = require('chai').expect;
const denodeify = require('denodeify');
const request = denodeify(require('request'));
const AddonTestApp = require('ember-cli-addon-tests').AddonTestApp;
const path = require('path');
const fs = require('fs-extra');

const testEmberVersions = ['latest']; // ['beta', 'latest', '3.12', '3.8', '3.4', '2.18'];

testEmberVersions.forEach(version => {
  describe(`basic registration in Ember version "${version}"`, function() {
    this.timeout(10000000);
    let app;

    before(function() {
      app = new AddonTestApp();

      return app.create('dummy', {
        emberVersion: version,
        fixturesPath: 'node-tests/fixtures',
        skipNpm: true
      })
      .then(() => {
        app.editPackageJSON(pkg => {
          pkg['ember-addon'] = pkg['ember-addon'] || {};
          pkg['ember-addon'].paths = pkg['ember-addon'].paths || [];
          pkg['ember-addon'].paths.push('lib/ember-service-worker-test');
          pkg['ember'] = pkg['ember'] || {};
          pkg['ember'].edition = 'classic';
        });
        return app.run('npm', 'install');
      })
    });

    beforeEach(() => {
      return app.startServer({
        detectServerStart(output) {
          return output.indexOf('Serving on ') > -1;
        }
      });
    });

    afterEach(function() {
      return app.stopServer();
    });

    it('includes registration in script tag by default', () => {
      return request({
        url: 'http://localhost:49741',
        headers: {
          'Accept': 'text/html'
        }
      }).then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.contain('<script src="/sw-registration.js"');
      });
    });

    it('produces a sw-registration.js file', () => {
      return request({
        url: 'http://localhost:49741/sw-registration.js'
      }).then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.contain('self.hello');
      });
    });

    it('produces a sw.js file', () => {
      return request({
        url: 'http://localhost:49741/sw.js'
      }).then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.contain('self.hello');
      });
    });
  });
});
