var URL = require('url');

var urls = [
  'http://spectacleenlignes.fr/plateforme/player?g=lecture-a-la-table_4af0d0&d=theatre&f=720p.mp4&p=dbe14364-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=lecture-a-la-table-jour-2_94c2cf&d=theatre&f=720p.mp4&p=d6f30018-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=premiers-pas-sur-le-plateau-jour-3_f0e090&d=theatre&f=720p.mp4&p=df55ed1a-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=premiers-pas-sur-le-plateau-jour-4_62598a&d=theatre&f=720p.mp4&p=d5491a72-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=debut-du-travail-de-precisi…lacte-1_583a96&d=theatre&f=720p.mp4&p=d61b00dc-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=debut-du-travail-de-precisi…-partie_78ba09&d=theatre&f=720p.mp4&p=d7257c00-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=debut-du-travail-de-precisi…-jour-6_2163ec&d=theatre&f=720p.mp4&p=d6881d34-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3_575187&d=theatre&f=720p.mp4&p=d9368d86-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3_327ce7&d=theatre&f=720p.mp4&p=dcf13444-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-partie-2_ea81a1&d=theatre&f=720p.mp4&p=e046b718-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-partie-3_c29e85&d=theatre&f=720p.mp4&p=d6c0035c-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-et-lact…-jour-8_c0d547&d=theatre&f=720p.mp4&p=d8fe658c-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-9_ecdc86&d=theatre&f=720p.mp4&p=df96887a-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-10_5efa30&d=theatre&f=720p.mp4&p=dc84f432-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-11_81c6dc&d=theatre&f=720p.mp4&p=d57e7c26-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-le-texte-en-ita…jour-12_cb7e14&d=theatre&f=720p.mp4&p=d9a610d4-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-14_d28fbf&d=theatre&f=720p.mp4&p=d4c5b600-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-15_b822f8&d=theatre&f=720p.mp4&p=d9707e2e-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-et-lact…jour-16_c8d610&d=theatre&f=720p.mp4&p=e0f3fc7a-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-17_9851f7&d=theatre&f=720p.mp4&p=d5e92346-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-17…-partie_7ccb06&d=theatre&f=720p.mp4&p=df17803e-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-18_5e9fe9&d=theatre&f=720p.mp4&p=e1665b26-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-jour-19_eb8c1b&d=theatre&f=720p.mp4&p=d50fea72-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-et-lact…jour-20_cdac55&d=theatre&f=720p.mp4&p=dcbac0ee-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-et-lact…-partie_3b0b72&d=theatre&f=720p.mp4&p=e0ba8616-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-et-lact…jour-22_4c3a75&d=theatre&f=720p.mp4&p=dc4c5898-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=premier-bout-a-bout-de-la-p…jour-23_73654f&d=theatre&f=720p.mp4&p=d8ca0314-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-et-lact…jour-24_3340dd&d=theatre&f=720p.mp4&p=d654f9b8-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-et-lact…jour-25_da3633&d=theatre&f=720p.mp4&p=dc13c8a2-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-et-lact…jour-26_a240a4&d=theatre&f=720p.mp4&p=e210beb8-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-27_3d5f91&d=theatre&f=720p.mp4&p=',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-et-lact…jour-29_f3c0e9&d=theatre&f=720p.mp4&p=e1dc7770-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte1-jour-30-…d87_PAS_DE_SON&d=theatre&f=720p.mp4&p=dd5686be-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte1-jour-30-…35f_PAS_DE_SON&d=theatre&f=720p.mp4&p=ddc1ca32-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-jour-31…8ea_PAS_DE_SON&d=theatre&f=720p.mp4&p=de6882aa-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-jour-31-a…692_PAS_DE_SON&d=theatre&f=720p.mp4&p=de2f686c-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-32…487_PAS_DE_SON&d=theatre&f=720p.mp4&p=ddf5f208-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-32…a3e_PAS_DE_SON&d=theatre&f=720p.mp4&p=dea607d8-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-33…ENT_SON_FAIBLE&d=theatre&f=720p.mp4&p=d7c66d68-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-33…-partie_b9a55f&d=theatre&f=720p.mp4&p=e01207ca-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-34…c4c01_ENCODAGE&d=theatre&f=720p.mp4&p=db32b0c4-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-3-jour-34…6a455_ENCODAGE&d=theatre&f=720p.mp4&p=da4b16b0-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-35…SON_DEBUT_VENT&d=theatre&f=720p.mp4&p=d75a5132-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=premier-bout-a-bout-de-la-p…-partie_6fed99&d=theatre&f=720p.mp4&p=d9e2fd32-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-jour-36…-partie_ea88af&d=theatre&f=720p.mp4&p=d5b49fea-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=deuxieme-bout-a-bout-a-grig…a_SON_GRESILLE&d=theatre&f=720p.mp4&p=d8920cca-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-1-et-lact…931_PAS_DE_SON&d=theatre&f=720p.mp4&p=dd8d4a0a-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-37…fb6_PAS_DE_SON&d=theatre&f=720p.mp4&p=dee11922-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-sur-lacte-2-jour-38…f6dae_ENCODAGE&d=theatre&f=720p.mp4&p=db709b3c-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=bout-a-bout-avec-les-enfant…293_SON_SATURE&d=theatre&f=720p.mp4&p=d83084a0-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=reglages-sur-lacte-2-jour-3…aef4f_ENCODAGE&d=theatre&f=720p.mp4&p=da84ae48-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=filage-de-la-piece-jour-39-…2_SON_GRESILLE&d=theatre&f=720p.mp4&p=d7909f94-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=reglages-dans-lacte-2-jour-…79e58_ENCODAGE&d=theatre&f=720p.mp4&p=daf2cbd0-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=filage-technique-jour-40-de…6_SON_GRESILLE&d=theatre&f=720p.mp4&p=d7f85468-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=travail-des-scenes-necessit…ODAGE_GRESILLE&d=theatre&f=720p.mp4&p=d860a590-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=filage-de-la-piece-jour-41-…-partie_062bc9&d=theatre&f=720p.mp4&p=dfd68ac4-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=reglage-de-la-fin-de-la-pie…515d5_ENCODAGE&d=theatre&f=720p.mp4&p=dbaeded8-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=filage-de-la-piece-jour-42-…-partie_154908&d=theatre&f=720p.mp4&p=da161da2-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=filage-de-la-piece-jour-43_b04136&d=theatre&f=720p.mp4&p=e080dd8a-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=derniers-reglages-avant-der…f3a6f_ENCODAGE&d=theatre&f=720p.mp4&p=dab8068a-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=dernier-filage-de-la-piece-…-partie_a299b6&d=theatre&f=720p.mp4&p=e12faf72-b8c0-11e3-b82e-005056ab0020',
  'http://spectacleenlignes.fr/plateforme/player?g=generale-de-la-piece-jour-4…862_PAS_DE_SON&d=theatre&f=720p.mp4&p=dd228bac-b8c0-11e3-b82e-005056ab0020'
];

var urlObjects = [];
urls.forEach(function(urlString) {
  var url = URL.parse(urlString, true);
  var query = url.query;
  var videoUrl = 'http://spectacleenlignes.fr/data/' + query.d + '/' + query.g + '/' + query.f;
  var jsonUrl = 'http://spectacleenlignes.fr/plateforme/ldt/cljson/id/' + query.p;
  urlObjects.push({
    video: videoUrl,
    json: jsonUrl
  });
});
console.log(urlObjects);