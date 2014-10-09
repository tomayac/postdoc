/**
 * @author tomac@google.com (Thomas Steiner)
 * @license Apache 2.0
 * @description Wikipedia/Wikidata-based Disaster Monitor
 */

'use strict';

var request = require('request');
var cheerio = require('cheerio');
var async = require('async');

var freebase = require('./freebase-util.js');
var specialNamespaces = (require('./special-namespaces.js')).namespaces;

var DEBUG = true;

var PARALLEL_LIMIT = 5;

var INCLUDE_INBOUND_LINKS = true; //false;
var INCLUDE_OUTBOUND_LINKS = true; //false;

var USER_AGENT =
    'Disaster Monitor * Contact: Thomas Steiner (tomac@google.com)';
var HEADERS = { 'User-Agent': USER_AGENT };

var WIKI_BASE_URL = 'http://{{BASE_LANGUAGE}}.wikipedia.org/wiki/';
var CATEGORY_BASE_URL = 'http://{{BASE_LANGUAGE}}.wikipedia.org/';
var LANGUAGE_LINKS_URL = 'http://{{BASE_LANGUAGE}}' +
    '.wikipedia.org/w/api.php?action=query&prop=langlinks&format=json' +
    '&lllimit=max&titles=';
var REDIRECTS_URL = 'http://{{LANGUAGE}}.wikipedia.org/w/api.php?action=query' +
    '&blnamespace=0&list=backlinks&blfilterredir=redirects&bllimit=max&' +
    'format=json&bltitle=';
var INBOUND_LINKS_URL = 'http://{{LANGUAGE}}.wikipedia.org/w/api.php' +
    '?action=query&list=backlinks&bllimit=max&blnamespace=0&format=json' +
    '&bltitle=';
var OUTBOUND_LINKS_URL = 'http://{{LANGUAGE}}.wikipedia.org/w/api.php' +
    '?action=query&prop=links&plnamespace=0&format=json&pllimit=max&titles=';
var WIKIDATA_URL = 'http://wikidata.org/w/api.php?action=wbgetentities' +
    '&sites=enwiki&format=json&titles=';

var CSS_QUERIES = {
  mainArticle: 'div.mainarticle a[href^="/wiki/"]',
  categoryArticle: 'div.mw-content-ltr li a[href^="/wiki/"]:not([class])',
  subCategoryLink:
      'div.mw-content-ltr li a[class~="CategoryTreeLabel"][href^="/wiki/"]',
  categoryNextLink: 'div.mw-content-ltr a[href^="/w/index"]',
  canonicalLink: 'link[rel="canonical"]'
};


var extractNamespaceNames = function(json, flag) {
  var temp = JSON.parse(json);
  var names = {};
  var rightToLeft = [
    'ar',
    'arc',
    'bcc',
    'bqi',
    'ckb',
    'dv',
    'fa',
    'glk',
    'he',
    'ku',
    'mzn',
    'pnb',
    'ps',
    'sd',
    'ug',
    'ur',
    'yi'
  ];
  temp.forEach(function(c) {
    var comp = c['*'].split(':');
    if (rightToLeft.indexOf(c.lang) === -1) {
      names[comp[flag ? 0 : 1]] = true;
    } else {
      names[comp[flag ? 1 : 0]] = true;
    }
  });
  return Object.keys(names);
};

var CATEGORY_NAMESPACES = (function() {
  // The JSON stems from the API call
  // http://en.wikipedia.org/w/api.php?action=query&prop=langlinks&format=json&lllimit=max&titles=Category:Wikipedia
  var json = '[{"lang":"ace","*":"Kawan:Wikip\u00e8dia"},{"lang":"ak","*":"Nkyekyem:Wikipedia"},{"lang":"ang","*":"Flocc:Wikip\u01e3dia"},{"lang":"ar","*":"\u062a\u0635\u0646\u064a\u0641:\u0648\u064a\u0643\u064a\u0628\u064a\u062f\u064a\u0627"},{"lang":"arz","*":"\u062a\u0635\u0646\u064a\u0641:\u0625\u062f\u0627\u0631\u0629\u0648\u064a\u0643\u064a\u0628\u064a\u062f\u064a\u0627"},{"lang":"as","*":"\u09b6\u09cd\u09f0\u09c7\u09a3\u09c0:\u09f1\u09bf\u0995\u09bf\u09aa\u09bf\u09a1\u09bf\u09af\u09bc\u09be"},{"lang":"ba","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"bar","*":"Kategorie:Wikipedia"},{"lang":"bat-smg","*":"Kateguor\u0117j\u0117:Vikiped\u0117j\u0117"},{"lang":"bcl","*":"Kategorya:Wikipedia"},{"lang":"be","*":"\u041a\u0430\u0442\u044d\u0433\u043e\u0440\u044b\u044f:\u0412\u0456\u043a\u0456\u043f\u0435\u0434\u044b\u044f"},{"lang":"be-x-old","*":"\u041a\u0430\u0442\u044d\u0433\u043e\u0440\u044b\u044f:\u0412\u0456\u043a\u0456\u043f\u044d\u0434\u044b\u044f"},{"lang":"bg","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0423\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"bh","*":"\u0936\u094d\u0930\u0947\u0923\u0940:\u0935\u093f\u0915\u093f\u092a\u0940\u0921\u093f\u092f\u093e"},{"lang":"bi","*":"Category:Wikipedia"},{"lang":"bjn","*":"Tumbung:Wikipidia"},{"lang":"bm","*":"Cat\u00e9gorie:Wikipedia"},{"lang":"bn","*":"\u09ac\u09bf\u09b7\u09af\u09bc\u09b6\u09cd\u09b0\u09c7\u09a3\u09c0:\u0989\u0987\u0995\u09bf\u09aa\u09bf\u09a1\u09bf\u09af\u09bc\u09be"},{"lang":"br","*":"Rummad:Wikipedia"},{"lang":"bs","*":"Kategorija:Wikipedia"},{"lang":"bug","*":"Kategori:Wikipedia"},{"lang":"bxr","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438:\u0412\u0438\u043a\u0438\u043f\u0435\u044d\u0434\u0438"},{"lang":"ca","*":"Categoria:Viquip\u00e8dia"},{"lang":"cbk-zam","*":"Categor\u00eda:Wikipedia"},{"lang":"cdo","*":"\u5206\u985e:Wikipedia"},{"lang":"ce","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438"},{"lang":"ceb","*":"Kategoriya:Wikipedya"},{"lang":"ch","*":"Katigoria:Wikipedia"},{"lang":"chr","*":"Category:\u13eb\u13a9\u13c7\u13d7\u13ef"},{"lang":"ckb","*":"\u067e\u06c6\u0644:\u0648\u06cc\u06a9\u06cc\u067e\u06cc\u062f\u06cc\u0627"},{"lang":"co","*":"Categoria:Wikipedia"},{"lang":"cr","*":"Category:\u1417\u146d\u1431\u144e\u152d"},{"lang":"crh","*":"Kategoriya:Vikipediya"},{"lang":"cs","*":"Kategorie:Wikipedie"},{"lang":"csb","*":"Kateg\u00f2r\u00ebj\u00f4:Wikipedij\u00f4"},{"lang":"cu","*":"\u041a\u0430\u0442\u0438\u0433\u043e\u0440\u0457\ua657:\u0412\u0438\u043a\u0438\u043f\u0454\u0434\u0457\ua657"},{"lang":"cv","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438"},{"lang":"cy","*":"Categori:Wicipedia"},{"lang":"da","*":"Kategori:Wikipedia"},{"lang":"de","*":"Kategorie:Wikipedia"},{"lang":"diq","*":"Kategori:Wikipediya"},{"lang":"dsb","*":"Kategorija:Wikipedija"},{"lang":"dz","*":"Category:Wikipedia"},{"lang":"ee","*":"Category:Wikipedia"},{"lang":"el","*":"\u039a\u03b1\u03c4\u03b7\u03b3\u03bf\u03c1\u03af\u03b1:\u0392\u03b9\u03ba\u03b9\u03c0\u03b1\u03af\u03b4\u03b5\u03b9\u03b1"},{"lang":"eo","*":"Kategorio:Vikipedio"},{"lang":"es","*":"Categor\u00eda:Wikipedia"},{"lang":"et","*":"Kategooria:Vikipeedia"},{"lang":"eu","*":"Kategoria:Wikipedia"},{"lang":"ext","*":"Category:Wikip\u00e9dia"},{"lang":"fa","*":"\u0631\u062f\u0647:\u0648\u06cc\u06a9\u06cc\u200c\u067e\u062f\u06cc\u0627"},{"lang":"ff","*":"Cat\u00e9gorie:Wikipeediya"},{"lang":"fi","*":"Luokka:Wikipedia"},{"lang":"fiu-vro","*":"Kat\u00f5gooria:Vikipeedi\u00e4"},{"lang":"fj","*":"Category:Wikipedia"},{"lang":"fo","*":"B\u00f3lkur:Wikipedia"},{"lang":"fr","*":"Cat\u00e9gorie:Wikip\u00e9dia"},{"lang":"frp","*":"Cat\u00e8gorie:Vouiquip\u00e8dia"},{"lang":"frr","*":"Kategorie:Wikipedia"},{"lang":"fur","*":"Categorie:Vichipedie"},{"lang":"fy","*":"Kategory:Wikipedy"},{"lang":"ga","*":"Catag\u00f3ir:Vicip\u00e9id"},{"lang":"gag","*":"Kategoriya:Vikipediya"},{"lang":"gan","*":"\u5206\u985e:\u7dad\u57fa\u767e\u79d1"},{"lang":"gl","*":"Categor\u00eda:Wikipedia"},{"lang":"glk","*":"\u0631\u062f\u0647:\u0648\u06cc\u06a9\u06cc\u067e\u062f\u06cc\u0627"},{"lang":"gn","*":"\u00d1emohenda:Vikipet\u00e3"},{"lang":"got","*":"\ud800\udf37\ud800\udf30\ud800\udf3d\ud800\udf43\ud800\udf30:\ud800\udf45\ud800\udf39\ud800\udf3a\ud800\udf39\ud800\udf40\ud800\udf34\ud800\udf33\ud800\udf3e\ud800\udf30"},{"lang":"gu","*":"\u0ab6\u0acd\u0ab0\u0ac7\u0aa3\u0ac0:\u0ab5\u0abf\u0a95\u0abf\u0aaa\u0ac0\u0aa1\u0abf\u0aaf\u0abe"},{"lang":"gv","*":"Ronney:Wikipedia"},{"lang":"ha","*":"Category:Wikipedia"},{"lang":"haw","*":"M\u0101hele:Wikipikia"},{"lang":"hi","*":"\u0936\u094d\u0930\u0947\u0923\u0940:\u0935\u093f\u0915\u093f\u092a\u0940\u0921\u093f\u092f\u093e"},{"lang":"hr","*":"Kategorija:Wikipedija"},{"lang":"hsb","*":"Kategorija:Wikipedija"},{"lang":"ht","*":"Kategori:Wikipedya"},{"lang":"hu","*":"Kateg\u00f3ria:Wikip\u00e9dia-adminisztr\u00e1ci\u00f3"},{"lang":"hy","*":"\u053f\u0561\u057f\u0565\u0563\u0578\u0580\u056b\u0561:\u054e\u056b\u0584\u056b\u057a\u0565\u0564\u056b\u0561"},{"lang":"hz","*":"Category:Wikipedia"},{"lang":"ia","*":"Categoria:Wikipedia"},{"lang":"id","*":"Kategori:Wikipedia"},{"lang":"ie","*":"Categorie:Wikipedia"},{"lang":"ig","*":"\u00d2t\u00f9:Wikipedia"},{"lang":"ik","*":"Category:Uiqipitia"},{"lang":"ilo","*":"Kategoria:Wikipedia"},{"lang":"io","*":"Kategorio:Wikipedio"},{"lang":"is","*":"Flokkur:Wikipedia"},{"lang":"it","*":"Categoria:Wikipedia"},{"lang":"iu","*":"Category:\u1405\u1403\u146d\u1431\u144e\u140a"},{"lang":"ja","*":"Category:\u30a6\u30a3\u30ad\u30da\u30c7\u30a3\u30a2"},{"lang":"jv","*":"Kategori:Wikipedia"},{"lang":"ka","*":"\u10d9\u10d0\u10e2\u10d4\u10d2\u10dd\u10e0\u10d8\u10d0:\u10d5\u10d8\u10d9\u10d8\u10de\u10d4\u10d3\u10d8\u10d0"},{"lang":"kaa","*":"Kategoriya:Wikipedia"},{"lang":"kab","*":"Taggayt:Wikipedia"},{"lang":"kbd","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044d:\u0423\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044d"},{"lang":"kg","*":"Kalasi:Wikipedia"},{"lang":"kk","*":"\u0421\u0430\u043d\u0430\u0442:\u0423\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"kl","*":"Sumutatassuseq:Wikipedia"},{"lang":"km","*":"\u1785\u17c6\u178e\u17b6\u178f\u17cb\u1790\u17d2\u1793\u17b6\u1780\u17cb\u1780\u17d2\u179a\u17bb\u1798:\u179c\u17b7\u1782\u17b8\u1797\u17b8\u178c\u17b6"},{"lang":"ko","*":"\ubd84\ub958:\uc704\ud0a4\ubc31\uacfc"},{"lang":"koi","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"kr","*":"Category:Wikipedia"},{"lang":"krc","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"ks","*":"\u0632\u0672\u0698:Wikipedia"},{"lang":"ksh","*":"Saachjrupp:Wikipedia"},{"lang":"ku","*":"Kategor\u00ee:W\u00eek\u00eepediya"},{"lang":"kv","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"kw","*":"Klass:Wikipedya"},{"lang":"ky","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0423\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"la","*":"Categoria:Vicipaedia"},{"lang":"lad","*":"Kateggor\u00eda:Wikipedia"},{"lang":"lb","*":"Kategorie:Wikipedia"},{"lang":"lbe","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"lez","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"lg","*":"Category:Wikipedia"},{"lang":"li","*":"Categorie:Wikipedia"},{"lang":"lij","*":"Categor\u00eea:Wikipedia"},{"lang":"lmo","*":"Categuria:Wikipedia"},{"lang":"ln","*":"Cat\u00e9gorie:Wikipedia"},{"lang":"lo","*":"\u0edd\u0ea7\u0e94:\u0ea7\u0eb4\u0e81\u0eb4\u0e9e\u0eb5\u0ec0\u0e94\u0e8d"},{"lang":"lt","*":"Kategorija:Vikipedija"},{"lang":"ltg","*":"Kategoreja:Vikipedeja"},{"lang":"lv","*":"Kategorija:Vikip\u0113dija"},{"lang":"map-bms","*":"Kategori:Wikipedia"},{"lang":"mdf","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0435:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u0435"},{"lang":"mg","*":"Sokajy:Wikipedia"},{"lang":"mh","*":"Category:Wikipedia"},{"lang":"mhr","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0439:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u0439"},{"lang":"mi","*":"Category:Wikipedia"},{"lang":"min","*":"Kategori:Wikipedia"},{"lang":"mk","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0458\u0430:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u0458\u0430"},{"lang":"ml","*":"\u0d35\u0d7c\u0d17\u0d4d\u0d17\u0d02:\u0d35\u0d3f\u0d15\u0d4d\u0d15\u0d3f\u0d2a\u0d40\u0d21\u0d3f\u0d2f"},{"lang":"mn","*":"\u0410\u043d\u0433\u0438\u043b\u0430\u043b:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u0430"},{"lang":"mo","*":"Categorie:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"mr","*":"\u0935\u0930\u094d\u0917:\u0935\u093f\u0915\u093f\u092a\u0940\u0921\u093f\u092f\u093e"},{"lang":"mrj","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438"},{"lang":"ms","*":"Kategori:Wikipedia"},{"lang":"mt","*":"Kategorija:Wikipedija"},{"lang":"mwl","*":"Catadorie:Biquip\u00e9dia"},{"lang":"myv","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f\u0441\u044c"},{"lang":"mzn","*":"\u0631\u062c:\u0648\u06cc\u06a9\u06cc\u200c\u067e\u062f\u06cc\u0627"},{"lang":"na","*":"Category:Wikipedia"},{"lang":"nah","*":"Neneuhc\u0101y\u014dtl:Huiquipedia"},{"lang":"nap","*":"Categur\u00eca:Wikipedia"},{"lang":"nds","*":"Kategorie:Wikipedia"},{"lang":"nds-nl","*":"Kategorie:Wikipedie"},{"lang":"ne","*":"\u0936\u094d\u0930\u0947\u0923\u0940:Wikipedia"},{"lang":"new","*":"\u092a\u0941\u091a\u0903:\u0935\u093f\u0915\u093f\u092a\u093f\u0921\u093f\u092f\u093e"},{"lang":"ng","*":"Category:Wikipedia"},{"lang":"nl","*":"Categorie:EncyclopedieWikipedia"},{"lang":"nn","*":"Kategori:Wikipedia"},{"lang":"no","*":"Kategori:Wikipedia"},{"lang":"nrm","*":"Category:Wikipedia"},{"lang":"nso","*":"Setensele:Wikipedia"},{"lang":"ny","*":"Category:Wikipedia"},{"lang":"oc","*":"Categoria:Wikip\u00e8dia"},{"lang":"or","*":"\u0b36\u0b4d\u0b30\u0b47\u0b23\u0b40:\u0b09\u0b07\u0b15\u0b3f\u0b2a\u0b3f\u0b21\u0b3c\u0b3f\u0b06"},{"lang":"os","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438"},{"lang":"pag","*":"Category:Wikipedia"},{"lang":"pam","*":"Category:Wikipedia"},{"lang":"pcd","*":"Cat\u00e9gorie:Wikip\u00e9dia"},{"lang":"pdc","*":"Abdeeling:Wikipedia"},{"lang":"pfl","*":"Sachgrubb:Wikipedia"},{"lang":"pl","*":"Kategoria:Wikipedia"},{"lang":"pnb","*":"Category:\u0648\u06a9\u06cc\u067e\u06cc\u0688\u06cc\u0627"},{"lang":"pnt","*":"\u039a\u03b1\u03c4\u03b7\u03b3\u03bf\u03c1\u03af\u03b1\u03bd:\u0392\u03b9\u03ba\u03b9\u03c0\u03b1\u03af\u03b4\u03b5\u03b9\u03b1"},{"lang":"pt","*":"Categoria:Wikip\u00e9dia"},{"lang":"qu","*":"Katiguriya:Wikipidiya"},{"lang":"rm","*":"Categoria:Vichipedia"},{"lang":"rmy","*":"Shopni:Vikipidiyakoxulyaripen"},{"lang":"rn","*":"Category:Wikipedia"},{"lang":"ro","*":"Categorie:Wikipedia"},{"lang":"roa-tara","*":"Category:Uicchip\u00e8die"},{"lang":"ru","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"rue","*":"\u041a\u0430\u0442\u0435\u0491\u043e\u0440\u0456\u044f:\u0412\u0456\u043a\u0456\u043f\u0435\u0434\u0456\u044f"},{"lang":"rw","*":"Category:Wikipedia"},{"lang":"sa","*":"\u0935\u0930\u094d\u0917\u0903:\u0935\u093f\u0915\u093f\u092a\u0940\u0921\u093f\u092f\u093e"},{"lang":"sah","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0411\u0438\u043a\u0438\u043f\u0438\u044d\u0434\u044c\u0438\u0439\u044d"},{"lang":"sc","*":"Categoria:Wikipedia"},{"lang":"scn","*":"Catigur\u00eca:Wikipedia"},{"lang":"sco","*":"Category:Wikipaedia"},{"lang":"se","*":"Kategoriija:Wikipedia"},{"lang":"sg","*":"Cat\u00e9gorie:Wikipedia"},{"lang":"sh","*":"Kategorija:Wikipedia"},{"lang":"si","*":"\u0db4\u0dca\u200d\u0dbb\u0dc0\u0dbb\u0dca\u0d9c\u0dba:Wikipedia"},{"lang":"simple","*":"Category:Wikipedia"},{"lang":"sk","*":"Kateg\u00f3ria:Wikip\u00e9dia"},{"lang":"sl","*":"Kategorija:Wikipedija"},{"lang":"sn","*":"Category:Wikipedia"},{"lang":"so","*":"Category:Wikipedia"},{"lang":"sq","*":"Kategoria:Wikipedia"},{"lang":"sr","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0458\u0430:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u0458\u0430"},{"lang":"srn","*":"Guru:Wikipedia"},{"lang":"ss","*":"Category:Wikipedia"},{"lang":"stq","*":"Kategorie:Wikipedia"},{"lang":"su","*":"Kategori:Wikip\u00e9dia"},{"lang":"sv","*":"Kategori:Wikipedia"},{"lang":"sw","*":"Jamii:Wikipedia"},{"lang":"szl","*":"Kategoryjo:Wikipedyjo"},{"lang":"ta","*":"\u0baa\u0b95\u0bc1\u0baa\u0bcd\u0baa\u0bc1:\u0bb5\u0bbf\u0b95\u0bcd\u0b95\u0bbf\u0baa\u0bcd\u0baa\u0bc0\u0b9f\u0bbf\u0baf\u0bbe"},{"lang":"te","*":"\u0c35\u0c30\u0c4d\u0c17\u0c02:\u0c35\u0c3f\u0c15\u0c40\u0c2a\u0c40\u0c21\u0c3f\u0c2f\u0c3e"},{"lang":"th","*":"\u0e2b\u0e21\u0e27\u0e14\u0e2b\u0e21\u0e39\u0e48:\u0e27\u0e34\u0e01\u0e34\u0e1e\u0e35\u0e40\u0e14\u0e35\u0e22"},{"lang":"ti","*":"Category:Wikipedia"},{"lang":"tk","*":"Kategori\u00fda:Wikipedi\u00fda"},{"lang":"tl","*":"Kategorya:Wikipedia"},{"lang":"tr","*":"Kategori:Vikipedi"},{"lang":"ts","*":"Category:Wikipedia"},{"lang":"tt","*":"\u0422\u04e9\u0440\u043a\u0435\u043c:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"tum","*":"Category:Wikipedia"},{"lang":"tw","*":"Category:Wikipedia"},{"lang":"ty","*":"Cat\u00e9gorie:Vitipetia"},{"lang":"udm","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f"},{"lang":"uk","*":"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f:\u0412\u0456\u043a\u0456\u043f\u0435\u0434\u0456\u044f"},{"lang":"ur","*":"\u0632\u0645\u0631\u06c1:\u0648\u06cc\u06a9\u06cc\u067e\u06cc\u0688\u06cc\u0627"},{"lang":"vep","*":"Kategorii:Vikipedii"},{"lang":"vi","*":"Th\u1ec3lo\u1ea1i:Wikipedia"},{"lang":"vo","*":"Klad:V\u00fckiped"},{"lang":"wo","*":"W\u00e0ll:Wikipedia"},{"lang":"wuu","*":"\u5206\u7c7b:\u7ef4\u57fa\u767e\u79d1"},{"lang":"xh","*":"Category:Wikipedia"},{"lang":"yi","*":"\u05e7\u05d0\u05b7\u05d8\u05e2\u05d2\u05d0\u05b8\u05e8\u05d9\u05e2:\u05d5\u05d5\u05d9\u05e7\u05d9\u05e4\u05e2\u05d3\u05d9\u05e2"},{"lang":"yo","*":"\u1eb8\u0300ka:Wikipedia"},{"lang":"za","*":"\u5206\u7c7b:VeizgiekBakgoh"},{"lang":"zh","*":"Category:\u7ef4\u57fa\u767e\u79d1"},{"lang":"zh-classical","*":"Category:\u7dad\u57fa\u5927\u5178"},{"lang":"zh-min-nan","*":"\u5206\u985e:Wikipedia"},{"lang":"zh-yue","*":"Category:\u7dad\u57fa\u767e\u79d1"}]';
  return extractNamespaceNames(json, true);
})();

var isCategoryPage = function(init) {
  return init.split(':').reduce(function(prev, curr) {
    return CATEGORY_NAMESPACES.indexOf(curr) !== -1 || prev;
  }, false);
};

var TEMPLATE_NAMESPACES = (function() {
  // The JSON stems from the API call
  //http://en.wikipedia.org/w/api.php?action=query&prop=langlinks&format=json&lllimit=max&titles=Help:Template
  var json = '[{"lang":"als","*":"Hilfe:Vorlage"},{"lang":"ar","*":"\u0645\u0633\u0627\u0639\u062f\u0629:\u0642\u0627\u0644\u0628"},{"lang":"as","*":"\u09b8\u09b9\u09be\u09af\u09bc:\u09b8\u09be\u0981\u099a"},{"lang":"bn","*":"\u09b8\u09be\u09b9\u09be\u09af\u09cd\u09af:\u099f\u09c7\u09ae\u09aa\u09cd\u09b2\u09c7\u099f"},{"lang":"ca","*":"Ajuda:Plantilla"},{"lang":"ckb","*":"\u06cc\u0627\u0631\u0645\u06d5\u062a\u06cc:\u062f\u0627\u0695\u06ce\u0698\u06d5"},{"lang":"cs","*":"N\u00e1pov\u011bda:\u0160ablony"},{"lang":"da","*":"Hj\u00e6lp:Skabeloner"},{"lang":"de","*":"Hilfe:Vorlagen"},{"lang":"diq","*":"Desteg:Template"},{"lang":"dsb","*":"Pomoc:P\u015bed\u0142ogi"},{"lang":"eo","*":"Helpo:\u015cablono"},{"lang":"es","*":"Ayuda:Plantillas"},{"lang":"et","*":"Juhend:Mall"},{"lang":"fa","*":"\u0631\u0627\u0647\u0646\u0645\u0627:\u0627\u0644\u06af\u0648"},{"lang":"fi","*":"Ohje:Malline"},{"lang":"fr","*":"Aide:Mod\u00e8le"},{"lang":"he","*":"\u05e2\u05d6\u05e8\u05d4:\u05ea\u05d1\u05e0\u05d9\u05d5\u05ea"},{"lang":"hsb","*":"Pomoc:P\u0159ed\u0142ohi"},{"lang":"hy","*":"\u054e\u056b\u0584\u056b\u057a\u0565\u0564\u056b\u0561:\u054e\u056b\u0584\u056b\u0546\u0561\u056d\u0561\u0563\u056b\u056e \u0548\u0582\u0572\u0565\u0563\u056b\u056e/\u0540\u0561\u0584\u0561\u0569\u0578\u0576/\u0555\u0563\u0576\u0578\u0582\u0569\u0575\u0578\u0582\u0576:\u053f\u0561\u0572\u0561\u057a\u0561\u0580"},{"lang":"id","*":"Bantuan:Templat"},{"lang":"ilo","*":"Tulong:Plantilia"},{"lang":"it","*":"Aiuto:Template"},{"lang":"ja","*":"Help:\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8"},{"lang":"jv","*":"Pitulung:Cithakan"},{"lang":"km","*":"\u1787\u17c6\u1793\u17bd\u1799:\u1791\u17c6\u1796\u17d0\u179a\u1782\u17c6\u179a\u17bc"},{"lang":"lt","*":"Pagalba:Kaip naudotis \u0161ablonais"},{"lang":"mr","*":"\u0938\u0939\u093e\u092f\u094d\u092f:\u0938\u093e\u091a\u093e"},{"lang":"ms","*":"Bantuan:Templat"},{"lang":"nds-nl","*":"Hulpe:Mallen"},{"lang":"nl","*":"Help:Gebruik van sjablonen"},{"lang":"no","*":"Hjelp:Maler"},{"lang":"oc","*":"Ajuda:Mod\u00e8l"},{"lang":"or","*":"\u0b38\u0b39\u0b2f\u0b4b\u0b17:Template"},{"lang":"ro","*":"Ajutor:Formate"},{"lang":"ru","*":"\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f:\u041c\u0435\u0445\u0430\u043d\u0438\u0437\u043c \u0448\u0430\u0431\u043b\u043e\u043d\u043e\u0432"},{"lang":"sh","*":"Pomo\u0107:\u0160ablon"},{"lang":"si","*":"\u0d8b\u0daf\u0dc0\u0dd4:Template"},{"lang":"simple","*":"Help:Template"},{"lang":"sq","*":"Ndihm\u00eb:Stampa"},{"lang":"sr","*":"\u041f\u043e\u043c\u043e\u045b:\u0428\u0430\u0431\u043b\u043e\u043d"},{"lang":"te","*":"\u0c38\u0c39\u0c3e\u0c2f\u0c02:\u0c2e\u0c42\u0c38"},{"lang":"th","*":"\u0e27\u0e34\u0e18\u0e35\u0e43\u0e0a\u0e49:\u0e41\u0e21\u0e48\u0e41\u0e1a\u0e1a"},{"lang":"tr","*":"Yard\u0131m:\u015eablon kullan\u0131m\u0131"},{"lang":"tt","*":"\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f:\u041a\u0430\u043b\u044b\u043f"},{"lang":"uk","*":"\u0414\u043e\u0432\u0456\u0434\u043a\u0430:\u0428\u0430\u0431\u043b\u043e\u043d\u0438"},{"lang":"ur","*":"\u0645\u0639\u0627\u0648\u0646\u062a:\u0633\u0627\u0646\u0686\u06c1"},{"lang":"vec","*":"Ajuto:Mode\u0142i"},{"lang":"vi","*":"Tr\u1ee3 gi\u00fap:B\u1ea3n m\u1eabu"},{"lang":"yi","*":"\u05d4\u05d9\u05dc\u05e3:\u05de\u05d5\u05e1\u05d8\u05e2\u05e8"},{"lang":"zh","*":"Help:\u6a21\u677f"}]';
  return extractNamespaceNames(json, false);
})();

var isTemplatePage = function(init) {
  return init.split(':').reduce(function(prev, curr) {
    return TEMPLATE_NAMESPACES.indexOf(curr) !== -1 || prev;
  }, false);
};

var isSpecialNamespace = function(init) {
  return init.split(':').reduce(function(prev, curr) {
    return specialNamespaces.indexOf(curr) !== -1 || prev;
  }, false);
};


var queryExpander = {
  pending: 1,
  maxDepth: Number.MAX_VALUE,
  seen: {},
  expandQueries: function(baseLanguage, init, maxCategoryDepth, mainCallback) {
    DEBUG && console.log('Start article: ' + init);
    var that = this;
    that.maxDepth = maxCategoryDepth;
    that.pending = 1;
    that.seen = {};
    async.waterfall([
      function(waterFallCallback) {
        if (isCategoryPage(init)) {
          // First, scrape all links per category or...
          that.getCategoryLinks(baseLanguage, init, {}, waterFallCallback, -1);
        } else {
          // ...First, scrape all "Main article:" links, i.e., disaster types
          that.getMainLinks(baseLanguage, init, waterFallCallback);
        }
      },
      function(links, waterFallCallback) {
        // Second, get the final canonical URLs (after redirection)
        var functions = {};
        for (var disaster in links) {
          var disasterOrigin = links[disaster];
          if (isSpecialNamespace(disaster)) {
            DEBUG && console.log('Skipped special namespace page: ' + disaster);
            continue;
          }
          var disasterUrl = WIKI_BASE_URL
              .replace(/\{\{BASE_LANGUAGE\}\}/, baseLanguage) +
              disaster.replace(/\s/g, '_');
          (function(url, origin) {
            functions[disaster] = function(innerCallback) {
              var options = {
                url: url,
                headers: HEADERS
              };
              DEBUG && console.log('Get canonical article: ' + options.url);
              request.get(options, function(err, response, body) {
                if (!err && response.statusCode === 200) {
                  var $ = cheerio.load(body);
                  var canonical;
                  $(CSS_QUERIES.canonicalLink).each(function(i, elem) {
                    canonical = $(elem).attr('href');
                  });
                  DEBUG && console.log('Canonical article: ' + canonical);
                  return innerCallback(null, {
                    canonical: canonical,
                    origin: origin
                  });
                } else {
                  // If singular doesn't work, try the version with plural 's'
                  var options = {
                    url: url + 's',
                    headers: HEADERS
                  };
                  DEBUG && console.log('Get canonical article (plural): ' +
                      options.url);
                  request.get(options, function(err, response, body) {
                    if (!err && response.statusCode === 200) {
                      $ = cheerio.load(body);
                      var canonical;
                      $(CSS_QUERIES.canonicalLink).each(function(i, elem) {
                        canonical = $(elem).attr('href');
                      });
                      DEBUG && console.log('Canonical article: ' + canonical);
                      return innerCallback(null, {
                        canonical: canonical,
                        origin: origin
                      });
                    } else {
                      // Fail gracefully, use the last known URL instead
                      DEBUG && console.log('No canonical article for: ' + url);
                      return innerCallback(null, {
                        canonical: url,
                        origin: origin
                      });
                    }
                  });
                }
              });
            };
          })(disasterUrl, disasterOrigin);
        }
        // Third, get all language links for all disaster types
        async.parallelLimit(
          functions,
          PARALLEL_LIMIT,
          function(err, results) {
            if (err) {
              return waterFallCallback(err);
            }
            var functions = {};
            for (var disaster in results) {
              var disasterOrigin = results[disaster].origin;
              var disasterArticle = results[disaster].canonical
                  .replace(/^.*?\/wiki\/(.*?)$/g, '$1');
              var disasterUrl = LANGUAGE_LINKS_URL
                  .replace(/\{\{BASE_LANGUAGE\}\}/, baseLanguage) +
                  disasterArticle;
              disasterArticle = disasterArticle.replace(/_/g, ' ');
              (function(url, article, origin) {
                functions[disaster] = function(innerCallback) {
                  var options = {
                    url: url,
                    headers: HEADERS
                  };
                  DEBUG && console.log('Get language links: ' + options.url);
                  request.get(options, function(err, response, body) {
                    if (!err && response.statusCode === 200) {
                      var data = JSON.parse(body);
                      var langLinks = {};
                      langLinks[baseLanguage] = {
                        // As on Wikipedia: "Blizzard_(météorologie)"
                        url: 'http://' + baseLanguage +
                            '.wikipedia.org/wiki/' +
                            article.replace(/\s/g, '_'),
                        // Simplified, without disambiguation hint: "Blizzard"
                        label: decodeURIComponent(article)
                            .replace(/\(.*?\)/g, '').trim(),
                         // As on Wikipedia: "Blizzard (météorologie)"
                        title: decodeURIComponent(article),
                        alternativeLabels: [],
                        alternativeTitles: []
                      };
                      if (!data.query || !data.query.pages) {
                        return innerCallback(null, {
                          origin: origin,
                          langLinks: langLinks
                        });
                      }
                      for (var pageId in data.query.pages) {
                        if (!data.query.pages[pageId].langlinks) {
                          return innerCallback(null,  {
                            langLinks: langLinks,
                            origin: origin
                          });
                        }
                        data.query.pages[pageId].langlinks.forEach(
                            function(langLink) {
                          langLinks[langLink.lang] = {
                            // As on Wikipedia: "Blizzard_(météorologie)"
                            url: 'http://' + langLink.lang +
                                '.wikipedia.org/wiki/' +
                                langLink['*'].replace(/\s/g, '_'),
                            // Simplified, without disambiguation hint:
                            // "Blizzard"
                            label: decodeURIComponent(langLink['*'])
                                .replace(/\(.*?\)/g, '').trim(),
                             // As on Wikipedia: "Blizzard (météorologie)"
                            title: decodeURIComponent(langLink['*'])
                          };
                        });
                        break;
                      }
                      // Fourth, get all redirects that lead to each article
                      that.getRedirects(langLinks, function(err,
                          redirectLinks) {
                        if (!err) {
                          for (var lang in redirectLinks) {
                            var redirects = redirectLinks[lang];
                            langLinks[lang].alternativeLabels = [];
                            langLinks[lang].alternativeTitles = [];
                            redirects.forEach(function(redirect) {
                              if (langLinks[lang].title !== redirect) {
                                langLinks[lang].alternativeLabels.push(
                                    redirect.replace(/\(.*?\)/g, '').trim());
                                langLinks[lang].alternativeTitles.push(
                                    redirect);
                              }
                            });
                          }
                        }
                        // Get the Wikidata QID
                        var options = {
                          url: WIKIDATA_URL + langLinks[baseLanguage].title
                              .replace(/\s/g, '_'),
                          headers: HEADERS
                        };
                        DEBUG && console.log('Get Wikidata QID: ' +
                            options.url);
                        request.get(options, function(err, response, body) {
                          if (!err && response.statusCode === 200) {
                            var data = JSON.parse(body);
                            var qid;
                            for (var entity in data.entities) {
                              qid = entity;
                              break;
                            }
                            if (qid === '-1') {
                              // Fail gracefully without Wikidata QID
                              return innerCallback(null,  {
                                langLinks: langLinks,
                                origin: origin
                              });
                            }
                            langLinks.wikidata = {
                              // As on Wikidata: "Q42"
                              url: 'http://wikidata.org/wiki/' + qid,
                              // Simplified, without disambiguation hint: "Q42"
                              label: qid,
                               // As on Wikidata: "Q42"
                              title: qid,
                              // pro forma
                              alternativeLabels: [],
                              // pro forma
                              alternativeTitles: []
                            };
                            if (INCLUDE_INBOUND_LINKS) {
                              // pro forma
                              langLinks.wikidata.inboundLinks = [];
                            }
                            if (INCLUDE_OUTBOUND_LINKS) {
                              // pro forma
                              langLinks.wikidata.outboundLinks = [];
                            }
                            if (INCLUDE_OUTBOUND_LINKS &&
                                INCLUDE_INBOUND_LINKS) {
                              // pro forma
                              langLinks.wikidata.mutualLinks = [];
                            }
                            // Get Freebase mid
                            if (langLinks.en) {
                              DEBUG && console.log('Get Freebase mid: ' +
                                  langLinks.en.url);
                              freebase.getFreebaseMid(
                                  'http://en.wikipedia.org/wiki/' +
                                  encodeURIComponent(langLinks.en.title
                                  .replace(/\s/g, '_')),
                                  function(freebaseErr, mid) {
                                if (freebaseErr) {
                                  mid = null;
                                }
                                // Fifth, get all inbound links
                                if (INCLUDE_INBOUND_LINKS) {
                                  var inboundLinksFunctions = {};
                                  Object.keys(langLinks).forEach(
                                      function(inboundLinksLang) {
                                    if (inboundLinksLang !== 'wikidata') {
                                      inboundLinksFunctions[inboundLinksLang] =
                                          function(inboundLinksCallback) {
                                        that.getInboundLinks(
                                            langLinks[inboundLinksLang].title,
                                            inboundLinksLang,
                                            inboundLinksCallback);
                                      };
                                    }
                                  });
                                  async.parallelLimit(
                                    inboundLinksFunctions,
                                    PARALLEL_LIMIT,
                                    function(err, inboundLinksResults) {
                                      Object.keys(inboundLinksResults).forEach(
                                          function(inboundLinksLang) {
                                        langLinks[inboundLinksLang].inboundLinks =
                                            inboundLinksResults[inboundLinksLang];
                                      });
                                      // Sixth, get all outbound links
                                      if (INCLUDE_OUTBOUND_LINKS) {
                                        var outboundLinksFunctions = {};
                                        Object.keys(langLinks).forEach(
                                            function(outboundLinksLang) {
                                          if (outboundLinksLang !== 'wikidata') {
                                            outboundLinksFunctions[
                                                outboundLinksLang] = function(
                                                outboundLinksCallback) {
                                              that.getOutboundLinks(
                                                  langLinks[outboundLinksLang]
                                                      .title,
                                                  outboundLinksLang,
                                                  outboundLinksCallback);
                                            };
                                          }
                                        });
                                        async.parallelLimit(
                                          outboundLinksFunctions,
                                          PARALLEL_LIMIT,
                                          function(err, outboundLinksResults) {
                                            Object.keys(outboundLinksResults)
                                                .forEach(
                                                function(outboundLinksLang) {
                                              langLinks[outboundLinksLang]
                                                  .outboundLinks =
                                                  outboundLinksResults[
                                                  outboundLinksLang];
                                              if (INCLUDE_OUTBOUND_LINKS &&
                                                  INCLUDE_INBOUND_LINKS) {
                                                langLinks[outboundLinksLang]
                                                    .mutualLinks =
                                                        langLinks[outboundLinksLang]
                                                        .outboundLinks.filter(
                                                            function(n) {
                                                          return langLinks[
                                                              outboundLinksLang]
                                                              .inboundLinks
                                                              .indexOf(n) !== -1;
                                                        });
                                              }
                                            });
                                            return innerCallback(null,  {
                                              langLinks: langLinks,
                                              origin: origin,
                                              freebaseMid: mid
                                            });
                                          }
                                        );
                                      }
                                    }
                                  );
                                } else {
                                  return innerCallback(null,  {
                                    langLinks: langLinks,
                                    origin: origin,
                                    freebaseMid: mid
                                  });
                                }
                              });
                            }
                          } else {
                            // Fail gracefully without Wikidata QID
                            return innerCallback(null,  {
                              langLinks: langLinks,
                              origin: origin
                            });
                          }
                        });
                      });
                    } else {
                      return innerCallback(err || 'Error: ' +
                          response.statusCode);
                    }
                  });
                };
              })(disasterUrl, disasterArticle, disasterOrigin);
            }
            async.parallelLimit(
              functions,
              PARALLEL_LIMIT,
              function(err, results) {
                if (err) {
                  return waterFallCallback(err);
                }
                return waterFallCallback(null, results);
              }
            );
          }
        );
      }
    ],
    function(err, results) {
      if (err) {
        return mainCallback(err);
      }
      DEBUG && console.log('Overall concepts: ' + Object.keys(results).length);
      return mainCallback(null, results);
    });
  },

  getRedirects: function(langLinks, mainCallback) {
    var functions = {};
    for (var lang in langLinks) {
      (function(innerLang) {
        functions[innerLang] = function(callback) {
          var options = {
            url: REDIRECTS_URL.replace(/\{\{LANGUAGE\}\}/, innerLang) +
                langLinks[innerLang].title.replace(/\s/g, '_'),
            headers: HEADERS
          };
          DEBUG && console.log('Get redirects: ' + options.url);
          request.get(options, function(err, response, body) {
            if (err || response.statusCode !== 200) {
              return callback(err || 'Error ' + response.statusCode);
            }
            var data = JSON.parse(body);
            var results = [];
            if ((data.query && data.query.backlinks) &&
                (Array.isArray(data.query.backlinks))) {
              var backlinks = data.query.backlinks;
              backlinks.forEach(function(backlink, i) {
                results[i] = backlink.title;
              });
            }
            return callback(null, results);
          });
        };
      })(lang);
    }
    async.parallelLimit(
      functions,
      PARALLEL_LIMIT,
      function(err, results) {
        if (err) {
          return mainCallback(err);
        }
        return mainCallback(null, results);
      }
    );
  },

  getMainLinks: function(baseLanguage, init, callback) {
    var options = {
      url: WIKI_BASE_URL.replace(/\{\{BASE_LANGUAGE\}\}/, baseLanguage) + init,
      headers: HEADERS
    };
    DEBUG && console.log('Get main article: ' + options.url);
    request.get(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback(err || 'Error ' + response.statusCode);
      }
      var $ = cheerio.load(body);
      var links = {};
      $(CSS_QUERIES.mainArticle).each(function(i, elem) {
        $(elem).text().split(/\sand\s/g).forEach(function(text) {
          var linkText = text
              .replace(/oes$/g, 'o') // remove irregular plural 'oes'
              .replace(/s$/g, '') // remove plural 's'
              .replace(/(?:List\sof|Types\sof)\s(largest\s)?/g, '') // no lists
              .replace(/\s?§.*?$/g, '') // remove paragraph markers
              .trim();
          linkText = linkText.split(' ').map(function(word, i) {
            return i === 0 ?
                word.substring(0, 1).toUpperCase() + word.substring(1) :
                word.toLowerCase();
          }).join(' ');
          DEBUG && console.log('Related main article: ' + linkText);
          links[linkText] = decodeURIComponent(init);
        });
      });
      return callback(null, links);
    });
  },

  getCategoryLinks: function(baseLanguage, init, links, callback, depth) {
    var that = this;
    var url;
    if (isCategoryPage(init)) {
      url = WIKI_BASE_URL.replace(/\{\{BASE_LANGUAGE\}\}/, baseLanguage) + init;
    } else {
      url = init;
    }
    if (that.seen[url]) {
      DEBUG && console.log('Circle detected, already processed: ' + url);
      that.pending--;
      if (that.pending === 0) {
        return callback(null, links);
      }
      return;
    }
    that.seen[url] = true;
    DEBUG && console.log('Start category page: ' + url);
    var options = {
      url: url,
      headers: HEADERS
    };
    request.get(options, function(err, response, body) {
      that.pending--;
      if (err || response.statusCode !== 200) {
        if (that.pending === 0) {
          return callback(err || response.statusCode);
        }
      }
      var $ = cheerio.load(body);
      // Extract all links on the current category page
      $(CSS_QUERIES.categoryArticle).each(function(i, elem) {
        links[$(elem).text()] = decodeURIComponent(init);
      });
      // Extract all subcategory links of the current category page
      $(CSS_QUERIES.subCategoryLink).each(function(i, elem) {
        if (i === 0) {
          depth++;
        }
        if (depth === that.maxDepth) {
          DEBUG && console.log('Maximum depth reached: ' + that.maxDepth);
          return false;
        }
        var current = $(elem).attr('href').replace(/^\/wiki\//, '');
        that.pending++;
        that.getCategoryLinks(baseLanguage, current, links, callback, depth);
      });
      // If the category is paginated, call yourself recursively
      $(CSS_QUERIES.categoryNextLink).each(function(i, elem) {
        if (/^next/i.test($(elem).text())) {
          var current = CATEGORY_BASE_URL
              .replace(/\{\{BASE_LANGUAGE\}\}/, baseLanguage) +
              $(elem).attr('href');
          that.pending++;
          that.getCategoryLinks(baseLanguage, current, links, callback, depth);
          // Each "next" link appears twice, so break out of the loop after
          // finding the first, which is achieved through returning false
          return false;
        } else {
          if (i + 1 === numLinks) {
            if (that.pending === 0) {
              return callback(null, links);
            }
          }
        }
      });
      var numLinks = $(CSS_QUERIES.categoryNextLink).length;
      if (numLinks === 0) {
        if (that.pending === 0) {
          return callback(null, links);
        }
      }
      if (that.pending === 0) {
        return callback(null, links);
      }
    });
  },

  getInboundLinks: function(title, language, callback) {
    var options = {
      url: INBOUND_LINKS_URL.replace(/\{\{LANGUAGE\}\}/, language) + title,
      headers: HEADERS
    };
    var getInboundLinksRecursive = function(options, inboundLinks, callback) {
      DEBUG && console.log('Get inbound links : ' + options.url);
      request.get(options, function(err, response, body) {
        if (err || response.statusCode !== 200) {
          return callback(err || 'Error ' + response.statusCode);
        }
        var data = JSON.parse(body);
        var blcontinue = false;
        if ((data['query-continue']) && (data['query-continue'].backlinks) &&
            (data['query-continue'].backlinks.blcontinue)) {
          blcontinue = data['query-continue'].backlinks.blcontinue;
          getInboundLinksRecursive(
              {url: options.url + '&blcontinue=' +
                  encodeURIComponent(blcontinue)},
              inboundLinks,
              callback);
        }
        if ((data.query) && (data.query.backlinks) &&
            (Array.isArray(data.query.backlinks))) {
          data.query.backlinks.forEach(function(inboundLink) {
            inboundLinks.push(inboundLink.title);
          });
        }
        if (!blcontinue) {
          return callback(null, inboundLinks);
        }
      });
    };
    getInboundLinksRecursive(options, [], callback);
  },

  getOutboundLinks: function(title, language, callback) {
    var options = {
      url: OUTBOUND_LINKS_URL.replace(/\{\{LANGUAGE\}\}/, language) + title,
      headers: HEADERS
    };
    var getOutboundLinksRecursive = function(options, outboundLinks, callback) {
      DEBUG && console.log('Get outbound links : ' + options.url);
      request.get(options, function(err, response, body) {
        if (err || response.statusCode !== 200) {
          return callback(err || 'Error ' + response.statusCode);
        }
        var data = JSON.parse(body);
        var plcontinue = false;
        if ((data['query-continue']) && (data['query-continue'].links) &&
            (data['query-continue'].links.plcontinue)) {
          plcontinue = data['query-continue'].links.plcontinue;
          getOutboundLinksRecursive(
              {url: options.url + '&plcontinue=' +
                  encodeURIComponent(plcontinue)},
              outboundLinks,
              callback);
        }
        if ((data.query) && (data.query.pages)) {
          var pageId = Object.keys(data.query.pages)[0];
          if (data.query.pages[pageId].links) {
            data.query.pages[pageId].links.forEach(function(outboundLink) {
              outboundLinks.push(outboundLink.title);
            });
          }
        }
        if (!plcontinue) {
          return callback(null, outboundLinks);
        }
      });
    };
    getOutboundLinksRecursive(options, [], callback);
  }
};

module.exports = queryExpander;