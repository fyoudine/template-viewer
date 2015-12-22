var path = require('path');
var fs = require('fs');
var assign = require('object-assign');
var Pageres = require('pageres');
var slugify = require('slugify-url');
var _ = require('underscore');

// Fix memory leak issue
require('events').EventEmitter.defaultMaxListeners = Infinity;

// @PrintscreensDatas
// @desc : Create an array of object to create printscreens
// @param {Object} options - Options of the module
//  options.tplToRender {Array}: Array of html file to rendered. Default : empty. NOTE : Avoid a big number of file or else your computer can be very slow
//  options.rootDir {String}: Root directory for printscreens. **PRINTSCREENS** ARE ALWAYS PUT IN "printscreens" folder - Default : ".public/". NOTE : if the directory doesn't exist it will be created
//  option.port {Number}: Server port.
//  option.optimization {Boolean}: Precise if you want to optimize the printscreen rendering. When it sets to "YES", ONLY new pages are rendered, the old one keep their old image - Default : true

// @returns {Array} : Array of objects 
var PrintscreensDatas = function PrintscreensDatas(options) {
  var imageFileTypeAccepted = ['.jpg', '.jpeg', '.png'];
  var filesCountMax = 0; // Number of element eligible for printscreens
  var filesCount = 0;
  var opts;
  
  this.init = function(options) {

    opts = assign({}, options);
    if (!opts.tplToRender) opts.tplToRender = [];
    if (!opts.rootDir) opts.rootDir = './public';
    if (!opts.port) opts.port = 3000;
    if (_.isUndefined(opts.optimization)) opts.optimization = true;
    opts.imgExtension = 'jpg';

    var printscreensDestDirectory = opts.rootDir + '/printscreens';
    this.files = [];
    if (!fs.existsSync(opts.rootDir)) {
      fs.mkdirSync(opts.rootDir);
    };

    var generatePrintscreens = function generatePrintscreens () {
      this.files = fs.readdirSync(opts.rootDir);
      this.files = this.files.filter(function(file) {
        // We want only "html" files and files wanted
        return file.substr(-5) === '.html' && opts.tplToRender.indexOf(file.split('.html')[0]) > -1;
      }).map(function(file) {
        // Prefix every html file by the root for pageres
        return 'http://127.0.0.1:' + opts.port + '/' + file;
      });

      filesCountMax = this.files.length;

      var imgInTheDirectory = fs.readdirSync(printscreensDestDirectory);
      var futureFilesInTheDirectory = this.files.map(function(file) { return slugify(file) + '.' + opts.imgExtension });
      // If user want optimization we render only image of new pages
      var pagesURL = opts.optimization === true ? _.difference(futureFilesInTheDirectory, imgInTheDirectory) : this.files;
      
      pageRendering(pagesURL, printscreensDestDirectory);
    }

    generatePrintscreens();
    
    // @generatePrintScreensDatas
    // @desc : Generate a JSON Object contained every datas of the printscreens
    // @returs JSON Object
    var generatePrintScreensDatas = function generatePrintScreensDatas() {
      var printscreenPath = printscreensDestDirectory;
      var printscreensArray = [];
      var fileName = '', url = '', tplName = '', imgPath;
      try {
        this.files.forEach(function(file) {
            fileName = path.basename(file, '.' + opts.imgExtension);
            tplName = fileName.split('!')[fileName.split('!').length - 1].split('.')[0];
            fileName = slugify(fileName);
            url = tplName + '.html';
            imageName = slugify(file) + '.' + opts.imgExtension;

            imgPath = 'http://127.0.0.1:' + opts.port + '/printscreens/' + imageName;
            
            if (imageFileTypeAccepted.indexOf(path.extname(imageName)) > -1) {
              var tplToolbarObject = {name: tplName, imgPath: imgPath, url: url};
              printscreensArray.push(tplToolbarObject);
            }
        });
      } catch (e) {
        console.log("issue with image parsing");
      }

      

      return {templates: printscreensArray};
    };

    function pageRendering (array, directory) {
      array.forEach(function(file) {
        // Prefix every html file by the root
          var pageres = new Pageres()
            .src(file, ['1000x1000'], {
              crop: false,
              filename: '<%= url %>',
              hide: ['#pages-overview-toolbar', '#__bs_notify__'],
              format: opts.imgExtension,
            })
            .dest(directory)
            .run()
            .then(() => dispatchGroupEmit());
        });
    }

    function dispatchGroupEmit() {
      filesCount++;
      if(filesCount >= filesCountMax) { 
        filesCount = 0;
        console.log(filesCountMax, " image(s) rendered !");
      }
      
    }

    return generatePrintScreensDatas();
  };

  return this.init(options);
};

module.exports = PrintscreensDatas;