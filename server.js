"use strict";

// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var moment = require('moment');
var scrapedData;
// var urlLocation = "https://www.leboncoin.fr/locations/offres/bretagne/?th=1&location=Noyal-sur-Vilaine%2035530&parrot=0&mre=850&sqs=7";
var urlBuy = "https://www.leboncoin.fr/ventes_immobilieres/offres/bretagne/?th=1&location=Noyal-sur-Vilaine%2035530&parrot=0&pe=11&sqs=8";
var urlSeLoger = 'http://www.seloger.com/list.htm?idtt=2&naturebien=1,2,4&idtypebien=1,2&ci=350207&tri=d_dt_crea&pxmax=270000&surfacemin=70';
var urlKermarrec = 'http://www.kermarrec.fr/achat/maison/noyal-sur-vilaine-35530/?budgetmax=270000&from=simple';
var urlLogic = 'http://www.logic-immo.com/vente-immobilier-noyal-sur-vilaine-35530,22810_2/options/pricemax=270000/areamin=70/order=update_date_desc';
var scrapeIt = null; //require("scrape-it");
var osmosis = null; //require('osmosis');
var request = null; //require('request');
var cheerio = null; //require('cheerio');
var Xray = require('x-ray');
var xrayDriver = require('./my-xray-driver');
// var phantom = require('phantom');
// var xrayPhantom = require('x-ray-phantom');
var xrayConfig = {
  filters: {
    date: function (value, format) {
      let d = moment(value, format);
      console.log('DATE', value, d);
      if (!d.isValid()) {
        // d = moment(new Date(), format);
        d = value;
        console.log('DATE MODIF', value, d);
      }
      return d;
    },
    price: function (value) {
      return typeof value === 'string' ? parseInt(value.replace(/[ ]/, ''), 10).toString().replace(/(\d{1,6})(\d{3})/, "$1&nbsp;$2") : value
    },
    trim: function (value) {
      return typeof value === 'string' ? value.trim() : value
    },
    reverse: function (value) {
      return typeof value === 'string' ? value.split('').reverse().join('') : value
    },
    slice: function (value, start , end) {
      return typeof value === 'string' ? value.slice(start, end) : value
    }
  }
};
var x = Xray(xrayConfig);
var xWin = Xray(xrayConfig).driver(xrayDriver('Windows1252'));
// var xPhantom = Xray().driver(xrayPhantom());

// // Callback interface
// scrapeIt(urlBuy, {
//     // Fetch the articles
//     articles: {
//         listItem: ".tabsContent li"
//       , data: {

//             // Get the article date and convert it into a Date object
//             date: {
//                 selector: ".item_price + .item_absolute > .item_supp"
//               , attr: "content"
//               , convert: x => new Date(x)
//             }
//           , time: {
//                 selector: ".item_price + .item_absolute > .item_supp"
//               , convert: x => x.split(' ')[2]
//             }
//           , title: ".item_title"
//           , url: {
//                 selector: "a"
//               , attr: "href"
//             }
//           , thumbnail: {
//                 selector: ".item_imagePic > .lazyload"
//               , attr: "data-imgsrc"
//             }
//           , nbImages: {
//             selector: ".item_imageNumber > span"
//           , convert: x => parseInt(x, 10)
//           }

//             // Get the content
//           // , content: {
//           //       selector: ".article-content"
//           //     , how: "html"
//           //   }
//         }
//     }
// }, (err, page) => {
//     console.log(err || page);
//     scrapedData=err || page;
// });

function scrapeWithOsmosis(request, response) {
  var results = [];
console.log(urlBuy);
  osmosis
        .get(urlBuy)//'https://www.leboncoin.fr/locations/offres/bretagne/?th=1&location=Noyal-sur-Vilaine%2035530&parrot=0')
        .find('.tabsContent li')
        .set({
          date: '.item_price + .item_absolute > .item_supp@content',
          time: '.item_price + .item_absolute > .item_supp',
          title: '.item_title',
          price: '.item_price@content',
          thumbnail: '.lazyload@data-imgsrc',
          url: '@href'
        })
        // .follow('@href')
        // .set({
        //   surface: '.line[8] .value',
        //   description: '.properties_description .value'
        // })
        .data(function (currentRes) {
          currentRes.src = 'LBC';
          var dateArray = currentRes.time.trim().split(' ');
          var dateParts = currentRes.date.split('-');
          currentRes.date = new Date(dateParts[0], dateParts[1]-1, dateParts[2]);
          var timeArray = dateArray[dateArray.length - 1].split(':');
          currentRes.date.setHours(timeArray[0]);
          currentRes.date.setMinutes(timeArray[1]);
          currentRes.time = undefined;
    console.log(currentRes);

          results.push(currentRes);
        })
        .done(function () {
          response.status(200).json(results);
        });
}

function scrapeLbcWithCheerio(req, resp) {
  var results = [];

  request(urlBuy, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(html);
      results = [];
      $('.tabsContent li').each(function(i, element){
        console.log('Cheerio ' + i);
        var price = $(this).find('.item_price').attr('content');
        var title = $(this).find('.item_title').text().trim();
        var thumbnail = $(this).find('.lazyload').attr('data-imgsrc');
        var nbImages = $(this).find('.item_imageNumber > span').text();
        var url = $(this).find('[href]').attr('href');
        var date = $(this).find('.item_price + .item_absolute > .item_supp').attr('content');
        var timeArray = $(this).find('.item_price + .item_absolute > .item_supp').text().trim().split(' ')
        var time = timeArray[timeArray.length - 1];
        // Our parsed meta data object
        var metadata = {
          date: new Date(date),
          time,
          price: parseFloat(price),
          thumbnail: thumbnail,
          nbImages: parseInt(nbImages, 10),
          title,
          url,
          src: 'LBC',
        };
        console.log(metadata);
        results.push(metadata);
      });
      resp.status(200).json(results);
    } else {
      console.log('Cheerio error: ' + response.statusCode + ' ' + error);
    }
  });
}

function scrapeLbcWithXRay(request, response) {
  var results = [];
  var url = urlBuy;
  console.log(url);
  xWin(url, '.tabsContent li', [{
      date: '.item_price + .item_absolute > .item_supp@content',// | trim | date:DD/MM/YYYY',
      title: '.item_title | trim',
      price: '.item_price@content | price',
      thumbnail: '.lazyload@data-imgsrc',
      url: 'a@href',
      // details: xWin('a@href', {
      //   description: '.properties_description .value@html'
      // })
  }])(function (err, results) {
    if (err) {
      console.log(err);
      response.status(500).json(err);
      return err;
    }
    
    console.log(results);
    
    results.forEach(function (item) {
      item.src = 'LBC';
      // item.description = (item.details && item.details.description) ? item.details.description : undefined;
      // item.details = undefined;
    });
    
    response.status(200).json(results);
  });
}


function scrapeOuestImmoWithOsmosis(request, response) {
  var results = [];
  var url = 'https://www.ouestfrance-immo.com/acheter/noyal-sur-vilaine-35-35530/?types=maison,appartement,demeure-exception&prix=0_250000&surface=70_0';
  console.log(url);
  osmosis
        .get(url)
        .find('.listeAnn li')
        .set({
          date: '.date',
          title: '.blocTxt h2 a',
          price: '.prix div[1]',
          thumbnail: '.photoAnn img@src',
          url: '@href'
        })
        // .follow('@href')
        // .set({
        //   surface: '.line[8] .value',
        //   description: '.properties_description .value'
        // })
        .data(function (currentRes) {
    console.log('avant', currentRes);
          currentRes.src = 'OUEST';
          if (currentRes.date) {
            var dateParts = currentRes.date.split('/');
            currentRes.date = new Date(dateParts[2], dateParts[1]-1, dateParts[0]);
          }
          currentRes.url = 'https://www.ouestfrance-immo.com' + currentRes.url;
    console.log('apres', currentRes);
          results.push(currentRes);
        })
        .done(function () {
          response.status(200).json(results);
        });
}

function scrapeOuestImmoWithXRay(request, response) {
  var results = [];
  var url = 'https://www.ouestfrance-immo.com/acheter/noyal-sur-vilaine-35-35530/?types=maison,appartement,demeure-exception&prix=0_250000&surface=70_0';
  console.log(url);
  x.driver(xrayDriver('utf-8'));

  x(url, '.listeAnn li:not(.pubsInterPA)', [{
      date: '.date | trim | date:DD/MM/YYYY',
      title: '.blocTxt h2 a | trim',
      price: '.prix .visible-phone | price',
      thumbnail: '.photoAnn img@data-original',
      url: 'a@href',
      details: x('a@href', {
        description: '.txtAnn@html'
      })
  }])(function (err, results) {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log(results);
    
    results.forEach(function (item) {
      item.src = 'OUEST';
      item.description = item.details.description;
      item.details = undefined;
    });

    response.status(200).json(results);
  });
}

function scrapeOuestImmoWithCheerio(req, resp) {
  var results = [];
  var url = 'https://www.ouestfrance-immo.com/acheter/noyal-sur-vilaine-35-35530/?types=maison,appartement,demeure-exception&prix=0_250000&surface=70_0';

  request({
    url: url,
    headers: {
     'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3196.0 Safari/537.36'
    }
  }, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(html);
      results = [];
      $('.listeAnn li:not(.pubsInterPA)').each(function(i, element){
        console.log('Cheerio ' + i);
        var price = $(this).find('prix .visible-phone').text();
        var title = $(this).find('.blocTxt h2 a').text().trim();
        var thumbnail = $(this).find('.photoAnn img').attr('data-original');
        //var nbImages = $(this).find('.item_imageNumber > span').text();
        var url = $(this).find('[href]').attr('href');
        var date = $(this).find('.date').text().trim();
        //var timeArray = $(this).find('.item_price + .item_absolute > .item_supp').text().trim().split(' ')
        //var time = timeArray[timeArray.length - 1];
        // Our parsed meta data object
        var metadata = {
          date: new Date(date),
          //time,
          price: parseFloat(price),
          thumbnail: thumbnail,
          //nbImages: parseInt(nbImages, 10),
          title,
          url,
          src: 'OUEST',
        };
        console.log(metadata);
        results.push(metadata);
      });
      resp.status(200).json(results);
    } else {
      console.log('Cheerio error: ' + response.statusCode + ' ' + error);
      resp.status(200).json(results);
    }
  });
}


function scrapeSeLogerWithOsmosis(request, response) {
  var results = [];

  osmosis
        .get('http://www.seloger.com/list.htm?idtt=2&naturebien=1,2,4&idtypebien=1,2&ci=350207&tri=d_dt_crea&pxmax=250000&surfacemin=70')
        .find('.liste_resultat article')
        .set({
          src: 'SELOGER',
          date: '.date',
          title: '.blocTxt h2 a',
          price: '.prix div[1]',
          thumbnail: '.photoAnn img@src',
          url: '@href'
        })
        // .follow('@href')
        // .set({
        //   surface: '.line[8] .value',
        //   description: '.properties_description .value'
        // })
        .data(function (currentRes) {
          if (currentRes.date) {
            var dateParts = currentRes.date.split('/');
            currentRes.date = new Date(dateParts[2], dateParts[1]-1, dateParts[0]);
          }
          currentRes.url = 'https://www.ouestfrance-immo.com' + currentRes.url;
          results.push(currentRes);
        })
        .done(function () {
          response.status(200).json(results);
        });
}


function scrapeSeLogerWithCheerio(req, resp) {
  var results = [];
  var url = urlSeLoger;

  request({
    url: url,
    headers: {
     'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3196.0 Safari/537.36'
    }
  }, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      // var $ = cheerio.load(html);
      // results = [];
      // $('.listeAnn li:not(.pubsInterPA)').each(function(i, element){
      //   console.log('Cheerio ' + i);
      //   var price = $(this).find('prix .visible-phone').text();
      //   var title = $(this).find('.blocTxt h2 a').text().trim();
      //   var thumbnail = $(this).find('.photoAnn img').attr('data-original');
      //   //var nbImages = $(this).find('.item_imageNumber > span').text();
      //   var url = $(this).find('[href]').attr('href');
      //   var date = $(this).find('.date').text().trim();
      //   //var timeArray = $(this).find('.item_price + .item_absolute > .item_supp').text().trim().split(' ')
      //   //var time = timeArray[timeArray.length - 1];
      //   // Our parsed meta data object
      //   var metadata = {
      //     date: new Date(date),
      //     //time,
      //     price: parseFloat(price),
      //     thumbnail: thumbnail,
      //     //nbImages: parseInt(nbImages, 10),
      //     title,
      //     url,
      //     src: 'OUEST',
      //   };
      //   console.log(metadata);
      //   results.push(metadata);
      // });
      resp.status(200).json(results);
    } else {
      console.log('Cheerio error: ' + response.statusCode + ' ' + error);
      resp.status(200).json(results);
    }
  });
}

function scrapeSeLogerWithXray(request, response) {
  var results = [];
  var url = urlSeLoger;
  console.log(url);
  x.driver(xrayDriver('utf-8'));
  //   }])
  x(url, '.liste_resultat .c-pa-list', [{
      // date: '.date | trim | date:DD/MM/YYYY',
      // title: '.blocTxt h2 a | trim',
      // price: '.prix .visible-phone | price',
      // thumbnail: '.photoAnn img@data-original',
      url: '.c-pa-info a@href',
      // description: '.listing_infos'
      details: x('.c-pa-info a@href', { // http://www.seloger.com/detail,json,caracteristique_bien.json?idannonce=114582789
        description: '.description-bien@html'
      })
  }])(function (err, results) {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log(results);
    
    results.forEach(function (item) {
      item.src = 'SELOGER';
      item.description = item.details.description;
      item.details = undefined;
    });
    
    //       if (currentRes.date) {
    //         var dateParts = currentRes.date.split('/');
    //         currentRes.date = new Date(dateParts[2], dateParts[1]-1, dateParts[0]);
    //       }
    //       currentRes.url = 'https://www.ouestfrance-immo.com' + currentRes.url;
    // console.log(currentRes);
    //       results.push(currentRes);
    //     })
    //     .done(function () {
    response.status(200).json(results);
  });
}

function scrapeKermarrecWithXray(request, response) {
  var results = [];
  var url = urlKermarrec;
  console.log(url);
  xWin(url, '.result-list li', [{
      date: '.item_price + .item_absolute > .item_supp@content',// | trim | date:DD/MM/YYYY',
      title: '.item_title | trim',
      price: '.item_price@content | price',
      thumbnail: '.lazyload@data-imgsrc',
      url: 'a@href',
      // details: xWin('a@href', {
      //   description: '.properties_description .value@html'
      // })
  }])(function (err, results) {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log(results);
    
    results.forEach(function (item) {
      item.src = 'KER';
      // item.description = (item.details && item.details.description) ? item.details.description : undefined;
      // item.details = undefined;
    });
    
    response.status(200).json(results);
  });
}


function scrapeLogicImmoWithXray(request, response) {
  var results = [];
  var url = urlLogic;
  console.log(url);
  x(url, '.offer-block', [{
      date: '.offer-update | date:DD/MM/YYYY',
      title: '.offer-type a@title | trim',
      price: '.offer-price span | price',
      thumbnail: '.lazy@data-original',
      url: '.offer-type a@href',
      // details: xWin('a@href', {
        description: '.offer-description | trim'
      // })
  }])(function (err, results) {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log(results);
    
    results.forEach(function (item) {
      item.src = 'LOG';
      // item.description = (item.details && item.details.description) ? item.details.description : undefined;
      item.details = undefined;
    });
    
    response.status(200).json(results);
  });
}

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/lbc-scrapeit", function (request, response) {
  response.json(scrapedData.articles);
});

app.get("/lbc-osmosis", function (request, response) {
  scrapeWithOsmosis(request, response);
});

app.get("/lbc-xray", function (request, response) {
  scrapeLbcWithXRay(request, response);
});

app.get("/ouest-osmosis", function (request, response) {
  scrapeOuestImmoWithOsmosis(request, response);
});

app.get("/ouest-xray", function (request, response) {
  scrapeOuestImmoWithXRay(request, response);
});

app.get("/seloger-osmosis", function (request, response) {
  scrapeSeLogerWithOsmosis(request, response);
});

app.get("/seloger-cheerio", function (request, response) {
  scrapeSeLogerWithCheerio(request, response);
});

app.get("/seloger-xray", function (request, response) {
  scrapeSeLogerWithXray(request, response);
});

app.get("/kermarrec-xray", function (request, response) {
  scrapeKermarrecWithXray(request, response);
});

app.get("/logic-xray", function (request, response) {
  scrapeLogicImmoWithXray(request, response);
});

app.get("/lbc-cheerio", function (request, response) {
  scrapeLbcWithCheerio(request, response);
});

app.get("/ouest-cheerio", function (request, response) {
  scrapeOuestImmoWithCheerio(request, response);
});

app.get("/pages", function (request, response) {
  response.send(scrapedData.pages);
});

app.get("/title", function (request, response) {
  response.send('Title');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});