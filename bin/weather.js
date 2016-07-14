#!/usr/bin/env node

var program = require('commander');
var fs = require("fs");
var path = require("path");
var app = require('../index');

program
  .version(JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"))).version)
  .option('-p, --ip', '根据当前ip查询天气信息', app.getDataByIP)
  .option('-a, --address [address]', '查询指定地址天气信息', app.getDataByAddress)
  .option('-s, --setting [address]', '设置默认地址', app.setDefaultAddress)
  .on('--help', function(){
    console.log('  Examples:');
    console.log('');
    console.log('    > 设置天气地址');
    console.log('');
    console.log('    $ weather -s "北京天安门"');
    console.log('    $ weather');
    console.log('');
    console.log('    > 根据当前ip查询');
    console.log('');
    console.log('    $ weather -p');
    console.log('');
  })
  .parse(process.argv);

if (!program.address && !program.ip && !program.setting) {
  app.getDataByDefault();
}