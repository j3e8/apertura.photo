var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var watch = require('gulp-watch');

gulp.task('admin-js', function() {
  gulp.src(['admin/js/main.js', 'admin/js/**/*.js', 'admin/**/*.js', '!admin/bundle.js'])
  .pipe(concat('admin/bundle.js'))
  .pipe(gulp.dest('./'));
});

gulp.task('app-js', function() {
  gulp.src(['app/js/main.js', 'app/js/**/*.js', 'app/**/*.js', '!app/bundle.js'])
  .pipe(concat('app/bundle.js'))
  .pipe(gulp.dest('./'));
});

gulp.task('main-js', function() {
  gulp.src(['main/js/main.js', 'main/js/**/*.js', 'main/**/*.js', '!main/bundle.js'])
  .pipe(concat('main/bundle.js'))
  .pipe(gulp.dest('./'));
});




gulp.task('admin-css', function() {
  gulp.src(['admin/css/main.+(css|scss)', 'admin/css/third-party/**/*.+(css|scss)', 'admin/css/**/*.+(css|scss)', 'admin/components/**/*.+(css|scss)', 'admin/pages/**/*.+(css|scss)'])
  .pipe(concat('admin/bundle.scss'))
  .pipe(sass())
  .pipe(gulp.dest('./'));
});

gulp.task('app-css', function() {
  gulp.src(['app/css/main.+(css|scss)', 'app/css/third-party/**/*.+(css|scss)', 'app/css/**/*.+(css|scss)', 'app/components/**/*.+(css|scss)', 'app/pages/**/*.+(css|scss)'])
  .pipe(concat('app/bundle.scss'))
  .pipe(sass())
  .pipe(gulp.dest('./'));
});

gulp.task('main-css', function() {
  gulp.src(['main/css/main.+(css|scss)', 'main/css/third-party/**/*.+(css|scss)', 'main/css/**/*.+(css|scss)', 'main/components/**/*.+(css|scss)', 'main/pages/**/*.+(css|scss)'])
  .pipe(concat('bundle.css'))
  .pipe(sass())
  .pipe(gulp.dest('./main'));
});



gulp.task('watch', function() {
  gulp.start('admin-js');
  gulp.start('app-js');
  gulp.start('main-js');

  gulp.start('admin-css');
  gulp.start('app-css');
  gulp.start('main-css');
  



  watch([
    'admin/**/*.js', '!admin/bundle.js'
  ], function() {
    gulp.start('admin-js');
  });

  watch([
    'app/**/*.js', '!app/bundle.js'
  ], function() {
    gulp.start('app-js');
  });

  watch([
    'main/**/*.js', '!main/bundle.js'
  ], function() {
    gulp.start('main-js');
  });



  watch([
    'admin/**/*.+(css|scss)', '!admin/bundle.css'
  ], function() {
    gulp.start('admin-css');
  });

  watch([
    'app/**/*.+(css|scss)', '!app/bundle.css'
  ], function() {
    gulp.start('app-css');
  });

  watch([
    'main/**/*.+(css|scss)', '!main/bundle.css'
  ], function() {
    gulp.start('main-css');
  });

});