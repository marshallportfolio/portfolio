//imports
var clean = require("del");
var concat = require("gulp-concat");
var connect = require("gulp-connect");
var csslint = require("gulp-csslint");
var eslint = require("gulp-eslint");
var eventStream = require("event-stream");
var gulp = require('gulp');
var gulpif = require("gulp-if");
var html2js = require("gulp-ng-html2js");
var minifyCss = require('gulp-clean-css');
var minifyHtml = require('gulp-htmlmin');
var newer = require("gulp-newer");
var notify = require("gulp-notify");
var plumber = require("gulp-plumber");
var replace = require("gulp-replace");
var runSequence = require("run-sequence");
var sass = require('gulp-sass');
var scsslint = require("gulp-scss-lint");
var sourcemaps = require('gulp-sourcemaps');
var uglify = require("gulp-uglify");


//convenience variables
var srcHtml = ['app/src/*.html'];
var srcTemplates = ['app/src/**/!(*.index).html'];
var srcSass = ['app/src/**/*.scss'];
var srcI18n = 'app/src/l10n/*.json';
var srcJs = [
    'app/src/**/*.constant.js',
    'app/src/**/*.module.js',
    'app/src/**/*.factory.js',
    'app/src/**/!(*.release).js',
    '!app/src/**/*.test.js'
];
var srcImages = ['app/src/images/**/*.*'];
var favIcon = "favicon.ico";
var dist = 'dist';
var vendorDist = dist + '/vendor';

//add all needed 3rd-party libraries here
var vendorSrcJs = [
    'node_modules/angular/angular.min.js',
    'node_modules/angular-route/angular-route.min.js',
    'node_modules/angular-ui-router/release/angular-ui-router.min.js',
    'node_modules/angular-moment/node_modules/moment/min/moment-with-locales.min.js',
    'node_modules/angular-moment/angular-moment.min.js',
    'node_modules/angular-sanitize/angular-sanitize.min.js',
    'node_modules/angular-translate/dist/angular-translate.min.js',
    'node_modules/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js'
];
var vendorSrcCss = [];
var vendorSrcFonts = [];
var isProd = false;
var timestamp = Date.now().toString();

// Tasks
gulp.task("default", function() {
    runSequence("clean", ["images", "sass", "html", "html-templates", "js", "vendor", "i18n"]);
});

gulp.task("clean", function(done) {
    return clean([dist], done);
});

gulp.task("images", function() {
    gulp.src(srcImages)
        .pipe(gulp.dest(dist + "/images"));
    gulp.src(favIcon)
        .pipe(gulp.dest(dist));
});

gulp.task("sass", function() {
    return eventStream.merge(
        compileSass(srcSass, dist, "app-styles" + timestamp + ".css"),
        compileSass(srcSass, dist, "app-styles" + timestamp + ".min.css", true)
    );
});

gulp.task("html", function() {
    return eventStream.merge(
        compileHtml(srcHtml, dist)
    );
});

gulp.task("html-templates", function() {
    return gulp.src(srcTemplates)
        .pipe(minifyHtml({collapseWhitespace: true}))
        .pipe(html2js({
            moduleName: "enterpriseApp.templates",
            useStrict: true
        }))
        .pipe(concat("templates" + timestamp  + ".js"))
        .pipe(uglify())
        .pipe(gulp.dest(dist + "/templates/"));
});

gulp.task("js", function() {
    return eventStream.merge(
        compileJs(
            srcJs,
            dist,
            "app" + timestamp + ".js",
            false,
            true,
            "",
            true //I lint things!
        ),
        compileJs(
            srcJs,
            dist,
            "app" + timestamp + ".min.js",
            true, //I minify things!
            false,
            ""
        )
    );
});


gulp.task("vendor", function() {
    return eventStream.merge(
        compileJs(vendorSrcJs, vendorDist, "vendor" + timestamp + ".js", true, false),
        gulp.src(vendorSrcCss)
            .pipe(concat("vendor" + timestamp + ".css"))
            .pipe(gulp.dest(vendorDist)),
        gulp.src(vendorSrcFonts)
            .pipe(gulp.dest(vendorDist + "/fonts"))
    );
});

gulp.task("i18n", function() {
    return gulp.src(srcI18n)
        .pipe(gulp.dest(dist + "/l10n"));
});

gulp.task("dev-server", function() {
    connect.server({
        root: "./dist",
        port: 63333
    });
});

function compileHtml(source, destination) {
    //we will always minify html because the dev console will prettify it
    return gulp.src(source)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(replace("app.js", "app" + timestamp + ".js"))
        .pipe(replace("app-styles.css", "app-styles" + timestamp + ".css"))
        .pipe(replace("vendor.js", "vendor" + timestamp + ".js"))
        .pipe(replace("vendor.css", "vendor" + timestamp + ".css"))
        .pipe(replace("templates.js", "templates" + timestamp + ".js"))
        .pipe(replace("app" + timestamp + ".js","app" + timestamp + ".min.js"))
        .pipe(replace("app-styles" + timestamp + ".css","app-styles" + timestamp + ".min.css"))
        .pipe(newer(dist))
        .pipe(minifyHtml({collapseWhitespace: true}))
        .pipe(gulp.dest(destination));
}

function compileSass(source, destination, concatName, minify, hideErrors) {
    return gulp.src(source, { base: "src" })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(sass())
        .pipe(gulpif(hideErrors, csslint.reporter()))
        .pipe(gulpif(minify, minifyCss()))
        .pipe(concat(concatName))
        .pipe(gulp.dest(destination + "/sass"));
}

function compileJs(source, destination, concatName, minify, showErrors, prefix, lint) {
    return gulp.src(source)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulpif(/[.]html$/, minifyHtml({
            empty: true,
            quotes: true,
            spare: true
        })))
        .pipe(gulpif(/[.]html$/, html2js({
            moduleName: "enterpriseApp.templates",
            useStrict: true
        })))
        .pipe(gulpif(lint, eslint()))
        .pipe(gulpif(lint, eslint.format()))
        .pipe(gulpif(lint, eslint.failAfterError()))
        .pipe(sourcemaps.init({identityMap: true}))
        .pipe(gulpif(minify, uglify({mangle: true})))
        .pipe(concat(concatName))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(destination));
}

function onError(err) {
    notify.onError(
        {
            title: "Gulp error in " + err.plugin,
            message: err.toString()
        }
    )(err);
    this.emit("end");
}
