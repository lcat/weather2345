var fs = require('fs');
var request = require('request');
var moment = require('moment');
var colors = require('colors')
var Grid = require("term-grid");
var cfg = require('./config');

var caiyun_skycon = cfg.caiyun_skycon;
var config = cfg.config;

/*
 * 根据ip获取经纬度
 */
var getDataByIP = function() {
  var requestUrl = 'http://api.map.baidu.com/location/ip?coor=bd09ll&ak=' + config.baidu;

  request({
    pool: false,
    agent: false,
    url: requestUrl,
    method: 'GET',
    json: true
  }, function(err, res, body) {
    if (!err && res.statusCode == 200 && body.status == 0) {
      var point = body.content && body.content.point;
      if (point) {
        getDataByLng({
          lng: point.x, // 经度
          lat: point.y // 纬度
        }, body.content.address);
      }
    }
  })
}

var getDataByAddress = function(address) {
    var requestUrl = 'http://api.map.baidu.com/geocoder/v2/?output=json&ak=' + config.baidu + '&address=' + encodeURI(address);
    request({
      pool: false,
      agent: false,
      url: requestUrl,
      method: 'GET',
      json: true
    }, function(err, res, body) {
      if (!err && res.statusCode == 200 && body.status == 0) {
        if (body.result && body.result.location) {
          getDataByLng(body.result.location, address);
        }
      } else {
        console.log();
        console.log('~> '.red + '无相关地址，请重试'.red);
        console.log();
      }
    })
  }
  /**
   * 获取默认地址
   * @return {[type]} [description]
   */
var getDataByDefault = function() {
  fs.readFile('setting.txt', function(err, data) {
    if (err) {

    }
    var defaultAddress = data;
    if (!defaultAddress) {
      console.log();
      console.log('    还未设置默认地址，执行以下命令设置'.green);
      console.log();
      console.log('    $ weather -s "默认地址***"'.cyan);
      console.log();
      return;
    }
    getDataByAddress(defaultAddress); 
  })
}

var setDefaultAddress = function(val) {
  val = val && val.trim();
  if (!val) {
    console.log('~> '.green + '未收到任何参数，你让我设置个鬼'.red);
    return;
  }
  // fs.open('./setting.txt', val);
  fs.open('setting.txt', 'w', function(err,fd){
    var buf = new Buffer(val);
    fs.write(fd, buf, 0, buf.length, 0, function(err,written,buffer){});
    console.log();
    console.log('~> '.green + '设置成功，直接执行'.green);
    console.log();
    console.log('   ' + '$ weather'.cyan);
    console.log();
  })
}

var getDataByLng = function(point, address) {
  var realTimeUrl = 'https://api.caiyunapp.com/v2/' + config.caiyun + '/' + point.lng + ',' + point.lat + '/realtime.json';
  var forecastUrl = 'https://api.caiyunapp.com/v2/' + config.caiyun + '/' + point.lng + ',' + point.lat + '/forecast.json';
  request(realTimeUrl, function(err, res, body) {
    body = JSON.parse(body);
    if (!err && res.statusCode == 200 && body.status === 'ok') {
      if (address) {
        body.address = address;
      }
      renderRealTime(body);
      request(forecastUrl, function(err, res, body) {
        body = JSON.parse(body);
        if (!err && res.statusCode == 200 && body.status === 'ok') {
          renderForecast(body);
        }
      })
    }
  })
}



/**
 * 实时天气
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
var renderRealTime = function(data) {
  var time = moment(Number(data.server_time.toString() + '000')).format('YYYY-MM-DD');
  var pm25 = data.result.pm25;
  var temperature = data.result.temperature;

  console.log('');
  console.log('~> '.green + '今天是 ' + time.bold + '  ' + data.address + '  ' + colors.cyan(temperature) + '°'.cyan + '  ' + colors.cyan(caiyun_skycon[data.result.skycon]));
  console.log('');
  if (0 <= pm25 && pm25 <= 50) {
    console.log('  - PM2.5: ' + colors.green(pm25));
  } else if (50 < pm25 && pm25 <= 100) {
    console.log('  - PM2.5: ' + colors.yellow(pm25));
  } else if (100 < pm25 && pm25 <= 150) {
    console.log('  - PM2.5: ' + colors.yellow(pm25).blod);
  } else if (150 < pm25 && pm25 <= 200) {
    console.log('  - PM2.5: ' + colors.red(pm25));
  } else if (200 < pm25 && pm25 <= 300) {
    console.log('  - PM2.5: ' + colors.magenta(pm25));
  } else if (pm25 > 300) {
    console.log('  - PM2.5: ' + colors.red(pm25).bgYellow.bold);
  }

  console.log('');
}

var renderForecast = function(data) {
  var gridData = [
    ['日期', '天气', '气温', 'pm25', '日出时间', '日落时间', '感冒指数'],
    ['', '', '', '', '', '', '']
  ];

  var daily = data.result.daily;
  var skycon = daily.skycon;
  var temperature = daily.temperature;
  var pm25 = daily.pm25;
  var astro = daily.astro;
  var coldRisk = daily.coldRisk;

  // 日期、skycon、气温、pm25、日出、日落、感冒指数

  var dateArr = [];
  var skyconArr = [];
  var temperatureArr = [];
  var coldRiskArr = []; // 感冒指数
  var pm25Arr = [];
  var sunsetArr = []; // 日洛
  var sunriseArr = []; // 日出

  skycon.map(function(item, index) {
    dateArr.push([item.date]);
    skyconArr.push(caiyun_skycon[item.value]);
  })

  temperature.map(function(item, index) {
    temperatureArr.push(item.min + '°~' + item.max + '°');
  })

  pm25.map(function(item, index) {
    pm25Arr.push((item.avg).toString().trim());
  })

  astro.map(function(item, index) {
    sunsetArr.push(item.sunset.time);
    sunriseArr.push(item.sunrise.time);
  })

  coldRisk.map(function(item, index) {
    coldRiskArr.push(item.desc);
  })

  dateArr.map(function(item, index) {
    var arr = [dateArr[index], skyconArr[index], temperatureArr[index], pm25Arr[index], sunriseArr[index], sunsetArr[index], coldRiskArr[index]];
    gridData.push(arr);
  })

  var grid = new Grid(gridData);
  grid.setColor(0, "green");
  // grid.setAlign(['center', 'center', 'center', 'left', 'left', 'center', 'center']);
  grid.draw();

  console.log();
  console.log(colors.cyan(data.result.minutely.description));
  console.log(colors.cyan(data.result.hourly.description));
  console.log();
  console.log(colors.dim('数据来源：百度地图、彩云天气'));
  console.log();
}

exports.getDataByIP = getDataByIP;
exports.getDataByLng = getDataByLng;
exports.getDataByAddress = getDataByAddress;
exports.getDataByDefault = getDataByDefault;
exports.setDefaultAddress = setDefaultAddress;