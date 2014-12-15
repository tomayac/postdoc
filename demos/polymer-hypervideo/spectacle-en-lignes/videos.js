var VIDEO_DATA = (function() {
  var urls = [
    /*
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment01.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment02.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment03.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment04.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment05.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment06.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment07.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment08.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment09.mp4',
    'http://spectacleenlignes.fr/data/theatre/scene-17-19/segment10.mp4',
    */
    'http://spectacleenlignes.fr/data/demonstrateur/bout-a-bout-avec-les-enfants_a4c293_SON_SATURE/bout-a-bout-avec-les-enfants_a4c293_SON_SATURE_a1',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a11',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a14',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a16',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a1',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a21',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a25',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a28',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a32',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a35',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a37',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a4',
    'http://spectacleenlignes.fr/data/demonstrateur/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96/debut-du-travail-de-precision-sans-texte-a-la-main-de-lacte-1_583a96_a7',
    'http://spectacleenlignes.fr/data/demonstrateur/filage-de-la-piece-jour-39-deuxieme-partie_eab942_SON_GRESILLE/filage-de-la-piece-jour-39-deuxieme-partie_eab942_SON_GRESILLE_a57',
    'http://spectacleenlignes.fr/data/demonstrateur/filage-de-la-piece-jour-39-deuxieme-partie_eab942_SON_GRESILLE/filage-de-la-piece-jour-39-deuxieme-partie_eab942_SON_GRESILLE_a61',
    'http://spectacleenlignes.fr/data/demonstrateur/filage-technique-jour-40-deuxieme-partie_58b2a6_SON_GRESILLE/filage-technique-jour-40-deuxieme-partie_58b2a6_SON_GRESILLE_a1',
    'http://spectacleenlignes.fr/data/demonstrateur/lecture-a-la-table_4af0d0/lecture-a-la-table_4af0d0_a10',
    'http://spectacleenlignes.fr/data/demonstrateur/lecture-a-la-table_4af0d0/lecture-a-la-table_4af0d0_a19',
    'http://spectacleenlignes.fr/data/demonstrateur/lecture-a-la-table_4af0d0/lecture-a-la-table_4af0d0_a24',
    'http://spectacleenlignes.fr/data/demonstrateur/lecture-a-la-table-jour-2_94c2cf/lecture-a-la-table-jour-2_94c2cf_a27',
    'http://spectacleenlignes.fr/data/demonstrateur/lecture-a-la-table-jour-2_94c2cf/lecture-a-la-table-jour-2_94c2cf_a33',
    'http://spectacleenlignes.fr/data/demonstrateur/premier-bout-a-bout-de-la-piece-jour-23_73654f/premier-bout-a-bout-de-la-piece-jour-23_73654f_a1',
    'http://spectacleenlignes.fr/data/demonstrateur/premiers-pas-sur-le-plateau-jour-4_62598a/premiers-pas-sur-le-plateau-jour-4_62598a_a38',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-15_b822f8/travail-sur-lacte-1-jour-15_b822f8_a10',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-15_b822f8/travail-sur-lacte-1-jour-15_b822f8_a12',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-15_b822f8/travail-sur-lacte-1-jour-15_b822f8_a16',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-15_b822f8/travail-sur-lacte-1-jour-15_b822f8_a17',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-15_b822f8/travail-sur-lacte-1-jour-15_b822f8_a1',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-15_b822f8/travail-sur-lacte-1-jour-15_b822f8_a6',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-1-jour-17-deuxieme-partie_7ccb06/travail-sur-lacte-1-jour-17-deuxieme-partie_7ccb06_a4',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-et-lacte-1-suivi-dun-filage-de-la-piece-jour-29_f3c0e9/travail-sur-lacte-2-et-lacte-1-suivi-dun-filage-de-la-piece-jour-29_f3c0e9_a18',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-jour-18_5e9fe9/travail-sur-lacte-2-jour-18_5e9fe9_a105',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-jour-18_5e9fe9/travail-sur-lacte-2-jour-18_5e9fe9_a110',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-jour-18_5e9fe9/travail-sur-lacte-2-jour-18_5e9fe9_a113',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-jour-18_5e9fe9/travail-sur-lacte-2-jour-18_5e9fe9_s_3E817D84-90C7-09C2-3C17-A922937DE6BE',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-jour-18_5e9fe9/travail-sur-lacte-2-jour-18_5e9fe9_s_80886BED-10D3-EED5-01E3-A9253A6C0A61',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-2-jour-18_5e9fe9/travail-sur-lacte-2-jour-18_5e9fe9_s_B314D56D-3142-42FF-97D1-A9265641F90A',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-22_4c3a75/travail-sur-lacte-3-et-lacte-1-jour-22_4c3a75_a86',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_a54',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_s_50E87BC4-79F3-378C-6C47-89E146D6B96A',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_s_582029C2-A859-4447-4AC2-89DF195B62B1',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_s_7996FD09-C3A0-F8F4-E3E2-89E30C3F7E8B',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_s_83FD7287-8DAD-E341-DD54-89E880D1DD5A',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_s_993D7E41-810F-AC29-1C95-8F4BBFE50D28',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547/travail-sur-lacte-3-et-lacte-1-jour-8_c0d547_s_D44414A7-9661-E2F9-5D74-89F2F5DA1215',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610_a67',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610_a71',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610_a76',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610_s_CF034B59-BC3B-BC94-C654-58658569D140',
    'http://spectacleenlignes.fr/data/demonstrateur/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610/travail-sur-lacte-3-et-lacte-2-jour-16_c8d610_s_F6811119-AB93-A19E-C184-58610996FDF3'
  ];

  var urlObjects = [];
  urls.forEach(function(urlString) {
    var id = new URL(urlString).pathname.split('/')[4];
    urlObjects.push({
      video: urlString,
      id: id
    });
  });
  return urlObjects;
})();