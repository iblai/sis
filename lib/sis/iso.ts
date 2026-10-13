/** ISO 3166-1: alpha-2, which `Intl.DisplayNames` reads, then alpha-3, which the DM stores. */
const REGIONS = `
AF AFG AX ALA AL ALB DZ DZA AS ASM AD AND AO AGO AI AIA AQ ATA AG ATG AR ARG AM ARM AW ABW
AU AUS AT AUT AZ AZE BS BHS BH BHR BD BGD BB BRB BY BLR BE BEL BZ BLZ BJ BEN BM BMU BT BTN
BO BOL BQ BES BA BIH BW BWA BV BVT BR BRA IO IOT BN BRN BG BGR BF BFA BI BDI CV CPV KH KHM
CM CMR CA CAN KY CYM CF CAF TD TCD CL CHL CN CHN CX CXR CC CCK CO COL KM COM CG COG CD COD
CK COK CR CRI CI CIV HR HRV CU CUB CW CUW CY CYP CZ CZE DK DNK DJ DJI DM DMA DO DOM EC ECU
EG EGY SV SLV GQ GNQ ER ERI EE EST SZ SWZ ET ETH FK FLK FO FRO FJ FJI FI FIN FR FRA GF GUF
PF PYF TF ATF GA GAB GM GMB GE GEO DE DEU GH GHA GI GIB GR GRC GL GRL GD GRD GP GLP GU GUM
GT GTM GG GGY GN GIN GW GNB GY GUY HT HTI HM HMD VA VAT HN HND HK HKG HU HUN IS ISL IN IND
ID IDN IR IRN IQ IRQ IE IRL IM IMN IL ISR IT ITA JM JAM JP JPN JE JEY JO JOR KZ KAZ KE KEN
KI KIR KP PRK KR KOR KW KWT KG KGZ LA LAO LV LVA LB LBN LS LSO LR LBR LY LBY LI LIE LT LTU
LU LUX MO MAC MG MDG MW MWI MY MYS MV MDV ML MLI MT MLT MH MHL MQ MTQ MR MRT MU MUS YT MYT
MX MEX FM FSM MD MDA MC MCO MN MNG ME MNE MS MSR MA MAR MZ MOZ MM MMR NA NAM NR NRU NP NPL
NL NLD NC NCL NZ NZL NI NIC NE NER NG NGA NU NIU NF NFK MK MKD MP MNP NO NOR OM OMN PK PAK
PW PLW PS PSE PA PAN PG PNG PY PRY PE PER PH PHL PN PCN PL POL PT PRT PR PRI QA QAT RE REU
RO ROU RU RUS RW RWA BL BLM SH SHN KN KNA LC LCA MF MAF PM SPM VC VCT WS WSM SM SMR ST STP
SA SAU SN SEN RS SRB SC SYC SL SLE SG SGP SX SXM SK SVK SI SVN SB SLB SO SOM ZA ZAF GS SGS
SS SSD ES ESP LK LKA SD SDN SR SUR SJ SJM SE SWE CH CHE SY SYR TW TWN TJ TJK TZ TZA TH THA
TL TLS TG TGO TK TKL TO TON TT TTO TN TUN TR TUR TM TKM TC TCA TV TUV UG UGA UA UKR AE ARE
GB GBR US USA UM UMI UY URY UZ UZB VU VUT VE VEN VN VNM VG VGB VI VIR WF WLF EH ESH YE YEM
ZM ZMB ZW ZWE
`;

/**
 * ISO 639-1 codes (what the DM stores) with the English name, for a browser that lacks one.
 * Twi (`tw`) is left out: ICU names it Akan, the same as `ak`.
 */
const LANGUAGES = `
aa Afar|ab Abkhaz|ae Avestan|af Afrikaans|ak Akan|am Amharic|an Aragonese|ar Arabic|as Assamese
av Avaric|ay Aymara|az Azerbaijani|ba Bashkir|be Belarusian|bg Bulgarian|bi Bislama|bm Bambara
bn Bengali|bo Tibetan|br Breton|bs Bosnian|ca Catalan|ce Chechen|ch Chamorro|co Corsican|cr Cree
cs Czech|cu Old Church Slavonic|cv Chuvash|cy Welsh|da Danish|de German|dv Divehi|dz Dzongkha
ee Ewe|el Greek|en English|eo Esperanto|es Spanish|et Estonian|eu Basque|fa Persian|ff Fula
fi Finnish|fj Fijian|fo Faroese|fr French|fy Western Frisian|ga Irish|gd Scottish Gaelic
gl Galician|gn Guaraní|gu Gujarati|gv Manx|ha Hausa|he Hebrew|hi Hindi|ho Hiri Motu|hr Croatian
ht Haitian|hu Hungarian|hy Armenian|hz Herero|ia Interlingua|id Indonesian|ie Interlingue
ig Igbo|ii Nuosu|ik Inupiaq|io Ido|is Icelandic|it Italian|iu Inuktitut|ja Japanese|jv Javanese
ka Georgian|kg Kongo|ki Kikuyu|kj Kwanyama|kk Kazakh|kl Kalaallisut|km Khmer|kn Kannada
ko Korean|kr Kanuri|ks Kashmiri|ku Kurdish|kv Komi|kw Cornish|ky Kyrgyz|la Latin
lb Luxembourgish|lg Ganda|li Limburgish|ln Lingala|lo Lao|lt Lithuanian|lu Luba-Katanga
lv Latvian|mg Malagasy|mh Marshallese|mi Māori|mk Macedonian|ml Malayalam|mn Mongolian
mr Marathi|ms Malay|mt Maltese|my Burmese|na Nauru|nb Norwegian Bokmål|nd Northern Ndebele
ne Nepali|ng Ndonga|nl Dutch|nn Norwegian Nynorsk|no Norwegian|nr Southern Ndebele|nv Navajo
ny Chichewa|oc Occitan|oj Ojibwe|om Oromo|or Oriya|os Ossetian|pa Panjabi|pi Pāli|pl Polish
ps Pashto|pt Portuguese|qu Quechua|rm Romansh|rn Kirundi|ro Romanian|ru Russian|rw Kinyarwanda
sa Sanskrit|sc Sardinian|sd Sindhi|se Northern Sami|sg Sango|si Sinhala|sk Slovak|sl Slovenian
sm Samoan|sn Shona|so Somali|sq Albanian|sr Serbian|ss Swati|st Southern Sotho|su Sundanese
sv Swedish|sw Swahili|ta Tamil|te Telugu|tg Tajik|th Thai|ti Tigrinya|tk Turkmen|tl Tagalog
tn Tswana|to Tonga|tr Turkish|ts Tsonga|tt Tatar|ty Tahitian|ug Uyghur|uk Ukrainian
ur Urdu|uz Uzbek|ve Venda|vi Vietnamese|vo Volapük|wa Walloon|wo Wolof|xh Xhosa|yi Yiddish
yo Yoruba|za Zhuang|zh Chinese|zu Zulu
`;

export interface CodeOption {
  value: string;
  label: string;
}

const byLabel = (options: CodeOption[], locale: string) => {
  const collator = new Intl.Collator(locale);
  return options.sort((a, b) => collator.compare(a.label, b.label));
};

/** Every country as its alpha-3 code, named in `locale` and sorted by name. */
export function countryOptions(locale: string): CodeOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const options: CodeOption[] = [];
  for (const [, alpha2, alpha3] of REGIONS.matchAll(/([A-Z]{2}) ([A-Z]{3})/g)) {
    options.push({ value: alpha3, label: names.of(alpha2) ?? alpha3 });
  }
  return byLabel(options, locale);
}

/** Every ISO 639-1 language, English first, the rest named in `locale` and sorted by name. */
export function languageOptions(locale: string): CodeOption[] {
  // Chrome ships ICU without names for a quarter of these; the English name steps in.
  const names = new Intl.DisplayNames([locale], { type: "language", fallback: "none" });
  const options = LANGUAGES.trim()
    .split(/\s*[|\n]\s*/)
    .map((entry) => {
      const [code = "", ...english] = entry.split(" ");
      const name = names.of(code) ?? english.join(" ");
      return { value: code, label: name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) };
    });
  const collator = new Intl.Collator(locale);
  return options.sort(
    (a, b) =>
      Number(b.value === "en") - Number(a.value === "en") || collator.compare(a.label, b.label),
  );
}
