// see the wd example for how to build this: https://github.com/admc/wd/blob/master/gulpfile.js
var gulp = require('gulp')
  , _ = require('lodash')
  , args   = require('yargs').argv
  , highland = require('highland')
  , path = require('path')
  , through = require('through')
  , SpawnMocha = require('spawn-mocha-parallel')
  , wd = require('wd')
  ;

/*
gulp.task('default', function () {
  gulp.watch('{lib,test}/*', test);
  test();
});
//*/

var expressPort = 3000; // incremented after each test to avoid colision
args.browsers = (args.browser || 'safari,firefox').split(',');
//args.browsers = (args.browser || 'safari').split(',');
//args.browsers = ('firefox').split(',');
//args.browsers = ('safari').split(',');
//var BROWSERS = ['safari'];
//var BROWSERS = ['safari', 'firefox'];
//var BROWSERS = ['firefox'];

var pathway = {};
pathway.relativePath = '/test/input-data/protocol/anchors.gpml.xml';

var pathways = [JSON.stringify(pathway)];

function mocha(opts) {
  var spawnMocha = new SpawnMocha(opts);
  var stream = through(function write(file) {
    spawnMocha.add(file.path);
  }, function() {});
  var errors = [];
  spawnMocha.on('error', function(err) {
    console.error(err.toString());
    errors.push(err);
  }).on('end', function() {
    if(errors.length > 0) {
      console.error('ERROR SUMMARY: ');
      _(errors).each(function(err) {
        console.error(err.toString());
      });
      stream.emit('error', "Some tests failed.");
    }
    stream.emit('end');
  });
  return stream;
}

function buildMochaOpts(opts) {
  var mochaOpts = {
    flags: {
      //u: 'bdd-with-opts',
      R: 'spec',
      b: true,
      t: 4000,
      c: true,
      debug: true,
    },
    bin: path.join('./node_modules/mocha/bin/mocha'),
    concurrency: args.concurrency | process.env.CONCURRENCY || 3
  };  
  if(args.grep) {
    mochaOpts.flags.g = args.grep;
  }
  mochaOpts.env = function() {
    var env = _.clone(process.env);
    env.PVJS_PATHWAY = pathways[0];
    if(opts.unit) {
      // unit test
      delete env.SAUCE;
      delete env.SAUCE_USERNAME;
      delete env.SAUCE_ACCESS_KEY;    
    } else {
      // midway + e2e tests
      env.BROWSER = opts.browser;
      env.SAUCE = args.sauce;
    }
    if(opts.midway) {
      // local server port
      env.EXPRESS_PORT = expressPort;
    }
    return env;
  };
  return mochaOpts;
}

function testLocalhost(browser) {
  var opts = buildMochaOpts({ midway: true, browser: browser });
  return gulp.src(['./test/tests/localhost.js'], {read: false, globals:[]}).pipe(mocha(opts));
}

//gulp.task('testLocalhost', ['browserSync'], function () {
gulp.task('testLocalhost', function () {
  return highland(args.browsers)
  .map(testLocalhost)
  .errors(function (e) {
    console.log('Error');
    console.log(e);
    //throw e;
  })
  .toArray(function (x) {
    //console.log(x);
    console.log('End of test');
  });
});
