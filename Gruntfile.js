/*global module:false*/
module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        meta: {
            banner: "/*! Mopidy.js v<%= pkg.version %> - built " +
                "<%= grunt.template.today('yyyy-mm-dd') %>\n" +
                " * http://www.mopidy.com/\n" +
                " * Copyright (c) <%= grunt.template.today('yyyy') %> " +
                "Stein Magnus Jodal and contributors\n" +
                " * Licensed under the Apache License, Version 2.0 */\n",
            files: {
                own: ["Gruntfile.js", "src/**/*.js"],
                main: "src/mopidy.js",
                concat: "dist/mopidy.js",
                minified: "dist/mopidy.min.js"
            }
        },
        browserify: {
            dist: {
                files: {
                    "<%= meta.files.concat %>": "<%= meta.files.main %>"
                },
                options: {
                    postBundleCB: function (err, src, next) {
                        next(err, grunt.template.process("<%= meta.banner %>") + src);
                    },
                    standalone: "Mopidy"
                }
            }
        },
        uglify: {
            options: {
                banner: "<%= meta.banner %>"
            },
            all: {
                files: {
                    "<%= meta.files.minified %>": ["<%= meta.files.concat %>"]
                }
            }
        },
        watch: {
            files: "<%= meta.files.own %>",
            tasks: ["default"]
        }
    });

    grunt.registerTask("build", ["browserify:dist", "uglify"]);
    grunt.registerTask("default", ["build"]);

    grunt.loadNpmTasks("grunt-browserify");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");
};
