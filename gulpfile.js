var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var minifyJS = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var deleteDirs = require('del');
var runSequence = require('run-sequence');
var autoprefixer = require('gulp-autoprefixer');
var bump = require('gulp-bump');
var yargs = require('yargs');
var diff = require('gulp-diff');
var sass = require('gulp-sass');
var rename = require("gulp-rename");

var buildFolder = './dist';
var buildJS = buildFolder + '/js';
var buildCSS = buildFolder + '/css';

var cssFolder = './app/css';
var jsDevFiles = [
  './app/js/gdprconsent.js'
];
var cssDevFiles = [
  cssFolder+'/gdprconsent.css'
];


gulp.task('cleanup:begin', function () {
  return deleteDirs([buildJS, buildCSS, cssFolder]);
});

gulp.task('sass', function(){
  return gulp.src('./app/scss/base.scss')
    .pipe(sass()) // Using gulp-sass
    .pipe(rename({
      basename: "gdprconsent",
      extname: ".css"
    }))
    .pipe(gulp.dest('app/css'))
    
});

gulp.task('minify:js', function () {
  return gulp.src(jsDevFiles)            // get files
    .pipe(minifyJS())                      // minify them
    .pipe(concat('gdprconsent.min.js'))  // combine them
    .pipe(gulp.dest(buildJS));          // save under a new name
});

gulp.task('minify:css', function () {
  return gulp.src(cssDevFiles)            // get files
    .pipe(autoprefixer({browsers: ['IE 10', 'last 2 versions']}))
    .pipe(minifyCSS())                      // minify them
    .pipe(concat('gdprconsent.min.css'))  // combine them
    .pipe(gulp.dest(buildCSS));          // save under a new name
});

gulp.task('bump', function(callback) {
  return gulp.src(['./package.json'])
             .pipe(bump({'version': yargs.argv.tag}))
             .pipe(gulp.dest('./'))
});

gulp.task('build', function(callback) {
  return runSequence('cleanup:begin', 'minify:js', 'sass', 'minify:css', callback);
});

gulp.task('verify', function(callback) {
  buildFolder = "./verify";
  buildJS = buildFolder + '/js';
  buildCSS = buildFolder + '/css';
  return runSequence('cleanup:begin', 'minify:js', 'sass', 'minify:css', 'verify:diffjs', 'verify:diffcss', callback);
});

gulp.task('verify:diffjs', function(callback) {
  return gulp.src('./dist/js/*')
             .pipe(diff('./verify/js'))
             .pipe(diff.reporter({ fail: true }));
});

gulp.task('verify:diffcss', function(callback) {
  return gulp.src('./dist/css/*')
             .pipe(diff('./verify/css'))
             .pipe(diff.reporter({ fail: true }));
});

gulp.task('build:release', function(callback) {
  if (yargs.argv.tag===undefined) {
    throw "A version number (e.g. 1.0.0) is required to build a release of gdprconsent"
  }

  return runSequence('build', 'bump', callback)
});

gulp.task('watch', function() {
  gulp.watch(['./app/**/*.scss', './app/**/*.js'], ['build']);
});

function _minify(opts) {
}
