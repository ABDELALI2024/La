-- LANGZIO seed: real starter lessons (A0–A1) + global vocabulary.
-- Import after schema.sql. Safe to re-run: uses INSERT IGNORE on slugs.
USE `langzio`;

INSERT IGNORE INTO `lessons` (`slug`,`level`,`category`,`title`,`summary`,`objectives`,`is_published`,`sort_order`) VALUES
('a0-greetings','A0','greetings','Greetings in Moroccan Darija','Say hello, goodbye and be polite like a local in 15 minutes.','["Greet someone at any time of day","Reply to common greetings","Use polite words: please, thank you, excuse me"]',1,10),
('a0-introductions','A0','introductions','Introduce yourself','Say your name, where you are from, and ask simple questions.','["Introduce yourself","Ask someone\u2019s name and origin","Answer \u201cwhere are you from?\u201d"]',1,20),
('a0-numbers-prices','A0','numbers','Numbers 0–20 and prices','Count, understand prices in dirhams, and ask \u201chow much?\u201d.','["Count 0–20","Understand prices in MAD","Ask and answer shhal?"]',1,30),
('a0-food-ordering','A0','food','Ordering food & drinks','Order tajine, couscous, tea and coffee with natural phrases.','["Order food politely","Ask for the menu and bill","Name 10 common dishes"]',1,40),
('a0-shopping-souk','A0','shopping','Shopping in the souk','Ask prices, bargain politely, and buy with confidence.','["Ask the price","Bargain without offending","Say sizes and quantities"]',1,50),
('a0-taxi-directions','A0','travel','Taxis & directions','Take a petit taxi, give directions, and ask where things are.','["Stop and direct a taxi","Ask \u201cwhere is\u2026?\u201d","Understand left/right/straight"]',1,60),
('a1-family-people','A1','family','Family & people','Talk about family, use possessives (dyali/dyalek), and describe people.','["Name family members","Use possessive particles","Describe age and relations"]',1,70),
('a1-everyday-expressions','A1','everyday','Everyday expressions','Sound natural with inshallah, bzaf, zwin, safi and more.','["Use 15 everyday expressions correctly","Understand context and register","Avoid common mix-ups with MSA"]',1,80),
('a1-questions-negation','A1','grammar','Questions & negation','Ask questions with wash/fin/kifash and negate with ma…sh.','["Form yes/no and wh-questions","Negate verbs correctly","Answer naturally"]',1,90),
('a1-travel-survival','A1','travel','Travel survival kit','Hotel, train station, airport and emergency phrases.','["Check in and ask for help","Read signs and tickets","Handle small problems"]',1,100),
('a2-workplace-basics','A2','work','Workplace communication','Polite workplace Darija: meetings, email openers, small talk.','["Greet colleagues","Ask for and offer help","Schedule and confirm"]',1,110),
('a2-culture-context','A2','culture','Moroccan culture in language','Hospitality, tea ritual, Ramadan and politeness codes.','["Understand hospitality formulas","Use cultural phrases appropriately","Avoid faux pas"]',1,120);

-- Sections (2–4 per lesson, markdown bodies) ----------------------------------
INSERT IGNORE INTO `lesson_sections` (`id`,`lesson_id`,`kind`,`heading`,`body_md`,`sort_order`) VALUES
(1,(SELECT id FROM lessons WHERE slug='a0-greetings'),'text','How greetings really work','In Morocco people greet warmly and often ask about health and family. **Labas?** (how are you?) is the everyday opener. Reply **labas, hamdullah** (fine, thank God). Time of day matters: **sbah lkhir** in the morning, **msa lkhir** in the evening.',10),
(2,(SELECT id FROM lessons WHERE slug='a0-greetings'),'vocab','Core phrases','See vocabulary below. Note: Darija spelling in Latin letters varies (shukran / choukran). We show one common form plus Arabic script.',20),
(3,(SELECT id FROM lessons WHERE slug='a0-greetings'),'exercise','Try it','Reply out loud: 1) Labas? 2) Sbah lkhir! 3) Shukran bzaf. Then mark the lesson complete and save 3 phrases to your vocabulary.',30),
(4,(SELECT id FROM lessons WHERE slug='a0-numbers-prices'),'text','Numbers 0–10','wahd (1), juj (2), tlata (3), rb3a (4), khmsa (5), stta (6), sb3a (7), tmnya (8), ts3ud (9), 3shra (10). Pronunciation: the number 3 often writes the Arabic letter ع (3ayn). That is why you see 3shra, tlata.',10),
(5,(SELECT id FROM lessons WHERE slug='a0-numbers-prices'),'example','At the shop','— Shhal hadi? (How much is this?)\n— Khmsa w 3shrin derhem. (25 dirhams.)\n— Ghali bzaf! Dir liya taman mzyan. (Too expensive! Give me a good price.)',20),
(6,(SELECT id FROM lessons WHERE slug='a0-food-ordering'),'text','Ordering politely','Start with **3afak** (please) and **bghit** (I want): *Bghit tajine djaj 3afak.* The bill: **l-hsab 3afak**. Tea: **atay**. Coffee: **qahwa**. Water: **l-ma**.',10),
(7,(SELECT id FROM lessons WHERE slug='a0-taxi-directions'),'text','Petit taxi basics','Raise your hand, say the destination: **l-maarif 3afak**. Ask the price before night rides: **shhal?** Directions: **l-imin** (right), **l-isr** (left), **nichan** (straight).',10),
(8,(SELECT id FROM lessons WHERE slug='a1-questions-negation'),'text','Negation with ma…sh','Darija wraps the verb: **ma** + verb + **sh**. *Ma fhemtsh* = I didn''t understand. *Ma 3reftsh* = I don''t know. Questions: **wash** (is it that…?), **fin** (where), **kifash** (how), **shnu** (what), **shhal** (how much/many).',10),
(9,(SELECT id FROM lessons WHERE slug='a2-culture-context'),'culture','Tea and hospitality','Mint tea (**atay**) is offered everywhere. Accepting is polite; refusing gently: *shukran, llah ikhellik*. During Ramadan, avoid eating in public during the day out of respect.',10);

-- Global vocabulary ------------------------------------------------------------
INSERT IGNORE INTO `vocabulary_items` (`id`,`darija_ar`,`transliteration`,`english`,`french`,`category`,`level`,`example_darija`,`example_en`) VALUES
(1,'سلام','salam','hello / peace','salut','greetings','A0','Salam, labas?','Hello, how are you?'),
(2,'لاباس؟','labas?','how are you?','ça va ?','greetings','A0','Labas, hamdullah.','Fine, thank God.'),
(3,'صباح الخير','sbah lkhir','good morning','bonjour (matin)','greetings','A0','Sbah lkhir, kif dayer?','Good morning, how are you?'),
(4,'مساء الخير','msa lkhir','good evening','bonsoir','greetings','A0','Msa lkhir!','Good evening!'),
(5,'شكرا','shukran','thank you','merci','greetings','A0','Shukran bzaf!','Thank you very much!'),
(6,'عفاك','3afak','please (asking)','s\u2019il te plaît','greetings','A0','Atay 3afak.','Tea, please.'),
(7,'سمح ليا','smah liya','excuse me / sorry','excuse-moi','greetings','A0','Smah liya, fin l WC?','Excuse me, where is the bathroom?'),
(8,'بسلامة','bslama','goodbye','au revoir','greetings','A0','Yallah, bslama!','Alright, goodbye!'),
(9,'سميتي','smiti…','my name is…','je m\u2019appelle…','introductions','A0','Smiti Yasmine.','My name is Yasmine.'),
(10,'منين انت؟','mnin nta / nti?','where are you from?','tu es d\u2019où ?','introductions','A0','Mnin nta? — Ana men fransa.','Where are you from? — I am from France.'),
(11,'شحال؟','shhal?','how much? / how many?','combien ?','numbers','A0','Shhal had l-baghrir?','How much are these baghrir?'),
(12,'درهم','derhem','Moroccan dirham','dirham','numbers','A0','3shrin derhem.','20 dirhams.'),
(13,'غالي','ghali','expensive','cher','shopping','A0','Ghali bzaf!','Too expensive!'),
(14,'رخيص','rkhis','cheap','pas cher','shopping','A0','Hada rkhis u mzyan.','This is cheap and good.'),
(15,'بريت','bghit','I want','je veux','food','A0','Bghit qahwa 3afak.','I want a coffee, please.'),
(16,'أتاي','atay','mint tea','thé à la menthe','food','A0','Jib liya atay 3afak.','Bring me a tea, please.'),
(17,'الحساب عفاك','l-hsab 3afak','the bill, please','l\u2019addition s\u2019il vous plaît','food','A0','L-hsab 3afak.','The bill, please.'),
(18,'طاكسي','taxi','taxi','taxi','travel','A0','Waqqef taxi 3afak.','Stop a taxi, please.'),
(19,'فين؟','fin…?','where is…?','où est… ?','travel','A0','Fin l-mehta?','Where is the station?'),
(20,'ليمن / ليسر / نيشان','l-imin / l-isr / nichan','right / left / straight','droite / gauche / tout droit','travel','A0','Sir nichan, w dur l-imin.','Go straight, then turn right.'),
(21,'بزاف','bzaf','a lot / very','beaucoup / très','everyday','A1','Zwina bzaf!','Very beautiful!'),
(22,'زوين','zwin / zwina','nice / beautiful','beau / belle','everyday','A1','Blasa zwina.','A nice place.'),
(23,'صافي','safi','ok / enough / done','c\u2019est bon / ça suffit','everyday','A1','Safi, baraka!','OK, enough!'),
(24,'إن شاء الله','inshallah','God willing (hopefully)','si Dieu veut','everyday','A1','Nshufuk ghdda inshallah.','See you tomorrow, hopefully.'),
(25,'ما فهمتش','ma fhemtsh','I didn\u2019t understand','je n\u2019ai pas compris','grammar','A1','Smah liya, ma fhemtsh.','Sorry, I didn\u2019t understand.'),
(26,'شنو؟','shnu?','what?','quoi ?','grammar','A1','Shnu smitk?','What is your name?'),
(27,'كيفاش؟','kifash?','how?','comment ?','grammar','A1','Kifash namshi l l-mdina?','How do I get to the old town?'),
(28,'عائلة','3a-ila','family','famille','family','A1','3a-ilti kbira.','My family is big.'),
(29,'ديالي','dyali','my (possessive)','mon / ma','family','A1','Hada dari dyali.','This is my house.'),
(30,'خدمة','khedma','work / job','travail','work','A2','3ndi khedma l-yum.','I have work today.');
