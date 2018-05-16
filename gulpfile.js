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

var buildFolder = './build';
var cssFolder = './src/css';
var jsBuildFiles = [
  './src/gdprconsent.js'
];
var cssBuildFiles = [
  // defined explicitly so they are combined in order
  './src/css/gdprconsent.css'
];


gulp.task('cleanup:begin', function () {
  return deleteDirs([buildFolder, cssFolder]);
});

gulp.task('sass', function(){
  return gulp.src('./src/styles/base.scss')
    .pipe(sass()) // Using gulp-sass
    .pipe(rename({
      basename: "gdprconsent",
      extname: ".css"
    }))
    .pipe(gulp.dest('src/css'))
    
});

gulp.task('minify:js', function () {
  return gulp.src(jsBuildFiles)            // get files
    .pipe(minifyJS())                      // minify them
    .pipe(concat('gdprconsent.min.js'))  // combine them
    .pipe(gulp.dest(buildFolder));          // save under a new name
});

gulp.task('minify:css', function () {
  return gulp.src(cssBuildFiles)            // get files
    .pipe(autoprefixer({browsers: ['IE 10', 'last 2 versions']}))
    .pipe(minifyCSS())                      // minify them
    .pipe(concat('gdprconsent.min.css'))  // combine them
    .pipe(gulp.dest(buildFolder));          // save under a new name
});

gulp.task('bump', function(callback) {
  return gulp.src(['./bower.json', './package.json'])
             .pipe(bump({'version': yargs.argv.tag}))
             .pipe(gulp.dest('./'))
});

gulp.task('build', function(callback) {
  return runSequence('cleanup:begin', 'minify:js', 'sass', 'minify:css', callback);
});

gulp.task('verify', function(callback) {
  buildFolder = "./build-verify";
  return runSequence('cleanup:begin', 'minify:js', 'sass', 'minify:css', 'verify:diff', callback);
});

gulp.task('verify:diff', function(callback) {
  return gulp.src('./build/*')
             .pipe(diff('./build-verify'))
             .pipe(diff.reporter({ fail: true }));
});

gulp.task('build:release', function(callback) {
  if (yargs.argv.tag===undefined) {
    throw "A version number (e.g. 1.0.0) is required to build a release of gdprconsent"
  }

  return runSequence('build', 'bump', callback)
});

gulp.task('watch', function() {
  gulp.watch(['./src/**/*.scss', './src/**/*.js'], ['build']);
});

function _minify(opts) {
}
