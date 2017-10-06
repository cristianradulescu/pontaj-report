"use strict";

var fs = require('fs');
var system = require('system');

var username = system.args[1],
    password = system.args[2],
    companyId = system.args[3],
    year = system.args[4],
    month = system.args[5],
    domain = system.args[6],
    timeout = 1000,
    userDetails = [],
    token = '',
    pontaj = [];

var debugMsg = false;

var jsonHeaders = { 
    "Content-Type": "application/json; charset=utf-8;",
    "Accept": "application/json, text/javascript, */*; q=0.01"
}

// get
var firstPage = require('webpage').create(),
    firstUrl = domain + '/platforma/?domain=emag';

// post
var loginPage = require('webpage').create(),
    loginUrl = domain + '/platforma/Login/Login?&domain=emag',
    loginData = 'Email=' + username + '&Password=' + password + '&SelectedLanguageId=2572b8f5-7285-4635-a7f6-95dd9b4eb2e3&UseSubdomainCredentials=False';

// post
var companyPage = require('webpage').create(),
    companyUrl = domain + '/platforma/Home/ChangeCompany',
    companyData = '{"company_id": "' + companyId + '", "data": null}';

// get
var tokenPage = require('webpage').create(),
    tokenUrl = domain + '/tm/saas/User/GetRSUser';

// post
var loadAppPage = require('webpage').create(),
    loadAppUrl = domain + '/platforma/Home/LoadApplication'
var mainAppPayload = '{"app_id":"8daaf10a-15c4-41f9-be53-545184b962f7"}';
var timeAppPayload = '{"app_id":"27cdc04d-2046-4b61-9268-4849c29de2ee"}';

var pontajPage = require('webpage').create(),
    pontajUrl = domain + '/services/RS.Services/PontajService.svc/GetEmployeeData',
    pontajData ='?profileId={profileId}&an={year}&luna={month}&employeeStartIndex=0&noEmployees=50&dimensions=&estePontajPlanificat=false&getSarbatori=true&pct_id=0&dpt_id=0&pontajLevelType=0&fnc_id=0&grp_id=0&nume=&cnp=&marca=&cc_id=0&statusPontaj=0&validation_id=0&act_id=0&ctg_id=0&prf_id=0&tallyViewType=0&getTotal=true&pra_id=0&sct_id=0&lcp_id=0&cnt_id=0&delegateId=null';

// start here
openFirstPage();

function openFirstPage()
{
    if (debugMsg) console.log('=> Open first page');
    firstPage.open(firstUrl, function (status) {
        openPageLogin();
    });
}

function openPageLogin()
{
    setTimeout(function() {
        if (debugMsg) console.log('=> Login')
        loginPage.open(loginUrl, 'post', loginData, function (status) {
            openPageCompany();
        });
        
    }, timeout);
}

function openPageCompany()
{
    setTimeout(function(){
        if (debugMsg) console.log('=> Change company')
        companyPage.open(companyUrl, 'post', companyData, jsonHeaders, function (status) {
            openPageMainApp();
        })
    }, timeout);
}

function openPageMainApp()
{
    setTimeout(function() {
        if (debugMsg) console.log('=> Load main app')
        loadAppPage.open(loadAppUrl, 'post', mainAppPayload, jsonHeaders, function (status) {
            openPageTimeApp();
        })
    }, timeout);
}

function openPageTimeApp()
{
    setTimeout(function() {
        if (debugMsg) console.log('=> Load time app')
        loadAppPage.open(loadAppUrl, 'post', timeAppPayload, jsonHeaders, function (status) {
            openPageToken();                            
        })
    }, timeout);
}

function openPageToken()
{
    setTimeout(function() {
        if (debugMsg) console.log('=> Get token')
        tokenPage.open(tokenUrl, 'get', [], jsonHeaders, function (status) {
            if (tokenPage.plainText == 'Unable to load application.') {
                openFirstPage();
            } else {
                token = JSON.parse(tokenPage.plainText).Token;
            }
            openPagePontaj();
        })
    }, timeout);
}

function openPagePontaj()
{
    setTimeout(function() {
        if (debugMsg) console.log('=> Get pontaj')
        var headers = jsonHeaders
        headers.token = token
        
        var profileId = getCookieValue('SAAS.PROFILE', loadAppPage.cookies);
        pontajData = pontajData.replace('{profileId}', profileId);
        pontajData = pontajData.replace('{year}', year);
        pontajData = pontajData.replace('{month}', month);

        pontajPage.open(pontajUrl+pontajData, 'get', [], headers, function (status) {
            if (debugMsg) console.log('=> Done');
            processPontaj(JSON.parse(pontajPage.plainText));
            phantom.exit();
        })
    }, timeout);
}

function listCookies(cookies)
{
    if (debugMsg) console.log('Listing cookies:');
    cookies.forEach(function(element) {
        if (debugMsg) console.log(element.name + '=' + element.value);
    });
}

function getCookieValue(cookieName, cookies) 
{
    var ck = cookies.filter(function(element) {
        return element.name === cookieName
    });
    if (ck.length == 0) {
        if (debugMsg) console.log('Cookie "' + cookieName + '" not found');
        return '';
    }
    return ck[0].value;
}

function processPontaj(pontajResponse)
{
    if (debugMsg) console.log('=> Process pontaj')

    var employeesResponse = pontajResponse.d.FinalResult.Employees;
    employeesResponse.forEach(function(employeeResponse) {
        var pontajRow = [];
        pontajRow.push(employeeResponse.NumePrenume)

        // remove 0 record
        var employeePontajeResponse = employeeResponse.Pontaje.slice(1)
        var days = employeePontajeResponse.map(function(element) {
            pontajRow.push(getPontajDayValue(element));
        });

        pontaj.push(pontajRow);
    });

    console.log(JSON.stringify(pontaj, undefined, 2));
}

function getPontajDayValue(pontajDay)
{
    if (pontajDay.length == 0) {
        return '-';
    }

    // if not empty use the only element
    pontajDay = pontajDay[0];

    if (pontajDay.TCO_ID == null && pontajDay.PNJ_VALOARE > 1) {
        return pontajDay.PNJ_VALOARE;
    }

    if (pontajDay.TCO_ID == 1) {
        return 'CO';
    }

    if (pontajDay.TCO_ID == 2) {
        return 'EVD';
    }

    if (pontajDay.ELM_ID == 20) {
        return 'ZN';
    }

    if (pontajDay.ELM_ID == 39) {
        return 'CM';
    }
}