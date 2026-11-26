
"use strict";

/* Zakerty - Local-first family memory research prototype */

const STORAGE_KEY = "zakerty_people_v1";
const SESSIONS_KEY = "zakerty_sessions_v1";
const STORIES_KEY = "zakerty_stories_v1";
const VOICE_SETTING_KEY = "zakerty_auto_voice_v1";
const ACCESSIBILITY_KEY = "zakerty_accessibility_v1";
const REMINDER_MEMORY_KEY = "zakerty_reminder_memory_v1";
const DB_NAME = "ZakertyPhotos";
const DB_VERSION = 3;
const PHOTO_STORE = "photos";
const AUDIO_STORE = "audio";
const STORY_AUDIO_STORE = "story-audio";
const MAX_AUDIO_SIZE = 12 * 1024 * 1024;
const MAX_RECORDING_MS = 30_000;
const REMINDER_API = "/api";
const ACCESSIBILITY_DEFAULTS = {
  language: "ar",
  theme: "light",
  highContrast: false,
  comfortMode: false,
  reduceMotion: false,
  fontSize: 16,
  lineSpacing: 1.7,
  letterSpacing: 0,
  speechRate: 0.9,
  instructionRepeats: 1
};

const $ = (selector) => document.querySelector(selector);
const textSources = new WeakMap();
const translatedText = new WeakMap();
const attributeSources = new WeakMap();
let translationObserver = null;
let currentTranslationLanguage = null;

const translationRows = [
  ["ذاكرتي | Zakerty", "Zakerty | Family Memories", "Zakerty | Souvenirs de famille"],
  ["ذ", "Z", "Z"],
  ["العودة للرئيسية", "Back to home", "Retour à l’accueil"],
  ["@aria-label:العودة للرئيسية", "@aria-label:Back to home", "@aria-label:Retour à l’accueil"],
  ["@aria-label:القائمة الرئيسية", "@aria-label:Main menu", "@aria-label:Menu principal"],
  ["ذاكرتي", "Zakerty", "Zakerty"],
  ["Zakerty · ألبوم العيلة", "Zakerty · Family album", "Zakerty · Album familial"],
  ["بيانات محلية على الجهاز", "Data stays on this device", "Données conservées sur cet appareil"],
  ["البيانات محفوظة على هذا الجهاز", "Data saved on this device", "Données enregistrées sur cet appareil"],
  ["🎙️ تكلّم مع ذاكرتي", "🎙️ Talk to Zakerty", "🎙️ Parler à Zakerty"],
  ["اضغط الزر وقل أمرًا. الميكروفون لا يعمل قبل الضغط؛ ذاكرتي لا تحفظ الصوت، وقد يعالجه المتصفح.", "Press the button and say a command. The microphone stays off until you press it. Zakerty does not save your voice; your browser may process it.", "Appuyez sur le bouton et dites une commande. Le micro reste désactivé jusque-là. Zakerty n’enregistre pas votre voix, mais votre navigateur peut la traiter."],
  ["ذكريات العيلة في مكان واحد", "Family memories in one place", "Les souvenirs de famille réunis"],
  ["كل وش مألوف، وكل حكاية ليها مكان ❤️", "A familiar face for every story ❤️", "Un visage familier, une place pour chaque histoire ❤️"],
  ["مساحة عائلية للصور والحكايات، وأنشطة تذكّر هادئة يمكن مشاركتها مع شخص مألوف وبالوتيرة المناسبة للمريض.", "A family space for photos, stories, and calm memory activities to share with someone familiar, at the person's pace.", "Un espace familial pour les photos, les récits et des activités de mémoire paisibles, à partager avec un proche au rythme de la personne."],
  ["أفراد العيلة", "Family members", "Membres de la famille"],
  ["الجلسات المسجلة", "Recorded sessions", "Séances enregistrées"],
  ["ابدأ جلسة ذكريات", "Start a memory session", "Commencer une séance de souvenirs"],
  ["إدارة أفراد العيلة", "Manage family", "Gérer la famille"],
  ["المناسبات العائلية القادمة 🎂", "Upcoming family occasions 🎂", "Prochains événements familiaux 🎂"],
  ["لحظة هادئة كل أسبوع", "A calm moment each week", "Un moment paisible chaque semaine"],
  ["ذكرى الأسبوع 🌿", "Memory of the week 🌿", "Souvenir de la semaine 🌿"],
  ["افتحوا الذكرى", "Open the memory", "Ouvrir le souvenir"],
  ["أضيفوا حكاية عائلية، وارجعوا لها معًا وقت ما تحبوا.", "Add a family story and revisit it together whenever you like.", "Ajoutez un récit familial et retrouvez-le ensemble quand vous le souhaitez."],
  ["أضيفوا أول حكاية", "Add your first story", "Ajouter votre premier récit"],
  ["القائمة الرئيسية", "Main menu", "Menu principal"],
  ["الرئيسية", "Home", "Accueil"],
  ["حكايات العيلة", "Family stories", "Récits de famille"],
  ["أنشطة التذكّر", "Memory activities", "Activités de mémoire"],
  ["البحث والنتائج", "Research and results", "Recherche et résultats"],
  ["الخصوصية", "Privacy and settings", "Confidentialité et réglages"],
  ["أفراد العيلة 👨‍👩‍👧", "Family members 👨‍👩‍👧", "Membres de la famille 👨‍👩‍👧"],
  ["ضيفوا الصور الحقيقية والمعلومات الخاصة بكل شخص.", "Add real photos and personal information for each family member.", "Ajoutez des photos et des informations personnelles pour chaque membre."],
  ["+ إضافة شخص", "+ Add a person", "+ Ajouter une personne"],
  ["ابحث عن فرد", "Search family", "Rechercher un proche"],
  ["@placeholder:الاسم أو صلة القرابة", "@placeholder:Name or relationship", "@placeholder:Nom ou lien de parenté"],
  ["ترتيب حسب", "Sort by", "Trier par"],
  ["الاسم", "Name", "Nom"],
  ["صلة القرابة", "Relationship", "Lien de parenté"],
  ["العمر من الأكبر", "Age, oldest first", "Âge, du plus âgé au plus jeune"],
  ["أقرب مناسبة", "Next occasion", "Prochain événement"],
  ["@aria-label:طريقة عرض العيلة", "@aria-label:Family display options", "@aria-label:Mode d’affichage de la famille"],
  ["عرض الأفراد", "People view", "Vue des personnes"],
  ["شجرة العيلة", "Family tree", "Arbre généalogique"],
  ["@aria-label:شجرة العيلة", "@aria-label:Family tree", "@aria-label:Arbre généalogique"],
  ["لسه مفيش أفراد مضافين. ابدأ بإضافة أول شخص.", "No family members yet. Add the first person to get started.", "Aucun membre pour le moment. Ajoutez la première personne."],
  ["مفيش أفراد مطابقين للبحث.", "No matching family members.", "Aucun membre ne correspond à la recherche."],
  ["حكايات العيلة 📖", "Family stories 📖", "Récits de famille 📖"],
  ["اجمعوا الحكايات والصور والأصوات في خط زمني عائلي. أضيفوا ذكرى بموافقة أصحابها.", "Bring stories, photos, and recordings together in a family timeline. Add memories with the storyteller’s consent.", "Réunissez récits, photos et enregistrements dans une chronologie familiale. Ajoutez un souvenir avec l’accord de la personne concernée."],
  ["أضيفوا حكاية جديدة", "Add a new story", "Ajouter un récit"],
  ["عنوان الحكاية", "Story title", "Titre du récit"],
  ["@placeholder:مثلاً: أول يوم في المدرسة", "@placeholder:For example: First day of school", "@placeholder:Par exemple : premier jour d’école"],
  ["الشخص المرتبط بالحكاية", "Person in this story", "Personne liée au récit"],
  ["تاريخ أو سنة الحكاية (اختياري)", "Story date or year (optional)", "Date ou année du récit (facultatif)"],
  ["احكوا لنا عنها", "Tell us about it", "Racontez-nous ce souvenir"],
  ["@placeholder:اكتبوا الذكرى كما تحبوا أن تفتكروها...", "@placeholder:Write the memory the way you want to remember it...", "@placeholder:Écrivez le souvenir comme vous souhaitez vous en rappeler…"],
  ["🎙️ إملاء الحكاية بالصوت", "🎙️ Dictate the story", "🎙️ Dicter le récit"],
  ["التسجيل الصوتي يبدأ فقط عند الضغط على الزر.", "Voice input starts only when you press the button.", "La saisie vocale commence uniquement après avoir appuyé sur le bouton."],
  ["تسجيل الحكاية (اختياري)", "Story recording (optional)", "Enregistrement du récit (facultatif)"],
  ["🎙️ سجّلوا الحكاية", "🎙️ Record the story", "🎙️ Enregistrer le récit"],
  ["إيقاف التسجيل", "Stop recording", "Arrêter l’enregistrement"],
  ["ارفعوا ملفًا صوتيًا أو سجّلوا ذكرى قصيرة حتى 30 ثانية. التسجيل محفوظ على هذا الجهاز.", "Upload an audio file or record a short memory (up to 30 seconds). It stays on this device.", "Importez un fichier audio ou enregistrez un bref souvenir (30 secondes max.). Il reste sur cet appareil."],
  ["حفظ الحكاية", "Save story", "Enregistrer le récit"],
  ["لسه مفيش حكايات محفوظة. ابدأوا بأول ذكرى عائلية.", "No stories saved yet. Add your first family memory.", "Aucun récit enregistré. Ajoutez votre premier souvenir familial."],
  ["لسه مفيش جلسات محفوظة.", "No sessions have been saved yet.", "Aucune séance n’a encore été enregistrée."],
  ["أنشطة التذكّر 🧠", "Memory activities 🧠", "Activités de mémoire 🧠"],
  ["اختاروا نشاطًا مناسبًا. جلسة الذكريات هادئة، من غير توقيت أو إجابات صح وغلط، وممكن تنهوها في أي وقت.", "Choose an activity that feels right. Memory sessions are calm, untimed, have no right or wrong answers, and can end at any time.", "Choisissez une activité adaptée. Les séances sont paisibles, sans minuterie ni bonne ou mauvaise réponse, et peuvent s’arrêter à tout moment."],
  ["Smart Recall — استدعاء متدرّج", "Smart Recall — gradual recall", "Smart Recall — rappel progressif"],
  ["مراجعة صور وحكايات بتلميحات اختيارية ومواعيد مرنة، بلا درجات أو إجابات خطأ", "Review photos and stories with optional cues and flexible timing—no scores or wrong answers.", "Revoir photos et récits avec des indices facultatifs et un rythme souple, sans score ni mauvaise réponse."],
  ["جلسة ذكريات هادئة", "Calm memory session", "Séance de souvenirs paisible"],
  ["استرجعوا الصور والحكايات معًا، خطوة بخطوة ومن غير اختبار", "Explore photos and stories together, step by step, without a test.", "Revivez photos et récits ensemble, pas à pas, sans test."],
  ["أنشطة التعرّف والبحث", "Recognition and research activities", "Activités de reconnaissance et de recherche"],
  ["اعرض أفراد العيلة وصلات القرابة التي أضفتموها", "View family members and the relationships you added", "Voir les membres de la famille et les liens ajoutés"],
  ["مستوى صعوبة الأسئلة", "Question difficulty", "Difficulté des questions"],
  ["سهل — اختياران", "Easy — 2 choices", "Facile — 2 choix"],
  ["متوسط — 3 اختيارات", "Medium — 3 choices", "Moyen — 3 choix"],
  ["تحدي — حتى 4 اختيارات", "Challenge — up to 4 choices", "Défi — jusqu’à 4 choix"],
  ["اقرأ الأسئلة بصوت تلقائيًا", "Read questions aloud automatically", "Lire automatiquement les questions à voix haute"],
  ["مين ده؟", "Who is this?", "Qui est-ce ?"],
  ["اختار الاسم المناسب للصورة", "Choose the name that matches the photo", "Choisissez le nom correspondant à la photo"],
  ["فاكر الحكاية؟", "Remember the story?", "Vous souvenez-vous du récit ?"],
  ["اربط التلميح بالشخص المناسب", "Match the clue to the person", "Associez l’indice à la bonne personne"],
  ["مين بيتكلم؟", "Who is speaking?", "Qui parle ?"],
  ["ترتيب العيلة", "Family order", "Ordre familial"],
  ["اسمع التسجيل واختار الشخص المناسب", "Listen to the recording and choose the person", "Écoutez l’enregistrement et choisissez la personne"],
  ["مختبر التجارب 📊", "Research dashboard 📊", "Tableau de recherche 📊"],
  ["رمز المشارك", "Participant code", "Code participant"],
  ["استخدم رمزًا مستعارًا بدل الاسم الحقيقي.", "Use a pseudonym instead of a real name.", "Utilisez un pseudonyme plutôt qu’un vrai nom."],
  ["وقت الجلسة", "Session time", "Moment de la séance"],
  ["الصباح", "Morning", "Matin"],
  ["بعد الظهر", "Afternoon", "Après-midi"],
  ["المساء", "Evening", "Soir"],
  ["الجلسات", "Sessions", "Séances"],
  ["متوسط الدقة", "Average accuracy", "Précision moyenne"],
  ["متوسط زمن الإجابة", "Average response time", "Temps de réponse moyen"],
  ["دقة الإجابات في آخر الجلسات", "Answer accuracy in recent sessions", "Précision des réponses lors des dernières séances"],
  ["هتظهر النتائج هنا بعد حفظ أول جلسة", "Results will appear here after the first session is saved.", "Les résultats apparaîtront ici après l’enregistrement de la première séance."],
  ["@aria-label:رسم بياني لدقة الإجابات في الجلسات المسجلة", "@aria-label:Chart of answer accuracy in recorded sessions", "@aria-label:Graphique de la précision des réponses aux séances enregistrées"],
  ["تصدير النتائج CSV", "Export results as CSV", "Exporter les résultats au format CSV"],
  ["تصدير نسخة مشفّرة بالصور والصوت", "Export encrypted backup with photos and audio", "Exporter une sauvegarde chiffrée avec photos et audio"],
  ["سجل الجلسات", "Session history", "Historique des séances"],
  ["الخصوصية والإعدادات 🔒", "Privacy and settings 🔒", "Confidentialité et réglages 🔒"],
  ["بياناتك تفضل على جهازك", "Your data stays on your device", "Vos données restent sur votre appareil"],
  ["التذكيرات النشطة 🔔", "Active reminders 🔔", "Rappels actifs 🔔"],
  ["تفعيل جدول التذكير", "Enable reminder schedule", "Activer la programmation des rappels"],
  ["وقت التذكير", "Reminder time", "Heure du rappel"],
  ["محتوى التذكير", "Reminder content", "Contenu du rappel"],
  ["رسالة ترحيبية", "A friendly greeting", "Un message de bienvenue"],
  ["صور العيلة", "Family photos", "Photos de famille"],
  ["حكاية عائلية", "A family story", "Un récit familial"],
  ["ذكرى بصورة أو صوت", "Memory with a photo or audio", "Souvenir avec photo ou audio"],
  ["لعبة تذكّر", "Memory activity", "Activité de mémoire"],
  ["الذكرى المرتبطة بالتذكير", "Memory linked to the reminder", "Souvenir associé au rappel"],
  ["أيام التذكير", "Reminder days", "Jours de rappel"],
  ["الأحد", "Sunday", "Dimanche"],
  ["الإثنين", "Monday", "Lundi"],
  ["الثلاثاء", "Tuesday", "Mardi"],
  ["الأربعاء", "Wednesday", "Mercredi"],
  ["الخميس", "Thursday", "Jeudi"],
  ["الجمعة", "Friday", "Vendredi"],
  ["السبت", "Saturday", "Samedi"],
  ["السماح بالإشعارات", "Allow notifications", "Autoriser les notifications"],
  ["ربط هذا الجهاز", "Connect this device", "Associer cet appareil"],
  ["حفظ جدول التذكير", "Save reminder schedule", "Enregistrer les rappels"],
  ["إرسال إشعار تجريبي", "Send a test notification", "Envoyer une notification test"],
  ["إيقاف التذكيرات", "Stop reminders", "Désactiver les rappels"],
  ["فصل هذا الجهاز", "Disconnect this device", "Dissocier cet appareil"],
  ["سهولة القراءة", "Reading accessibility", "Confort de lecture"],
  ["لغة الموقع", "Website language", "Langue du site"],
  ["اختاروا لغة الواجهة", "Choose the interface language", "Choisissez la langue de l’interface"],
  ["راحة القراءة والمظهر", "Reading comfort and appearance", "Confort de lecture et apparence"],
  ["سرعة وتكرار الصوت يطبّقان على التعليمات المقروءة؛ يمكن الاستماع إلى الحكايات والتسجيلات يدويًا.", "Speech speed and repetition apply to spoken instructions. Stories and recordings can still be played manually.", "La vitesse et la répétition s’appliquent aux consignes vocales. Les récits et enregistrements restent disponibles en lecture manuelle."],
  ["اختاروا المظهر والمسافات وحجم النص المريح. تُحفظ التفضيلات على هذا الجهاز.", "Choose a comfortable theme, spacing, and text size. Preferences are saved on this device.", "Choisissez un thème, un espacement et une taille de texte confortables. Vos préférences sont enregistrées sur cet appareil."],
  ["المظهر", "Theme", "Thème"],
  ["فاتح", "Light", "Clair"],
  ["داكن", "Dark", "Sombre"],
  ["تباين عالٍ", "High contrast", "Contraste élevé"],
  ["وضع الراحة بألوان دافئة", "Warm comfort mode", "Mode confort aux couleurs chaudes"],
  ["تقليل الحركة والانتقالات", "Reduce motion and transitions", "Réduire les animations et transitions"],
  ["حجم النص", "Text size", "Taille du texte"],
  ["@aria-label:تصغير حجم النص", "@aria-label:Decrease text size", "@aria-label:Réduire la taille du texte"],
  ["حجم النص الافتراضي", "Default text size", "Taille de texte par défaut"],
  ["@aria-label:تكبير حجم النص", "@aria-label:Increase text size", "@aria-label:Augmenter la taille du texte"],
  ["المسافة بين السطور", "Line spacing", "Espacement des lignes"],
  ["المسافة بين الحروف", "Letter spacing", "Espacement des lettres"],
  ["إعدادات الصوت والتعليمات", "Audio and instruction settings", "Réglages audio et consignes"],
  ["سرعة القراءة الصوتية", "Speech rate", "Vitesse de lecture audio"],
  ["تكرار التعليمات", "Instruction repetition", "Répétition des consignes"],
  ["مرة واحدة", "Once", "Une fois"],
  ["مرتين", "Twice", "Deux fois"],
  ["ثلاث مرات", "Three times", "Trois fois"],
  ["تشفير النسخة الاحتياطية", "Encrypt backup", "Chiffrer la sauvegarde"],
  ["النسخ الاحتياطي", "Backups", "Sauvegardes"],
  ["تصدير نسخة احتياطية مشفّرة", "Export encrypted backup", "Exporter une sauvegarde chiffrée"],
  ["استعادة نسخة احتياطية", "Restore backup", "Restaurer une sauvegarde"],
  ["حذف البيانات", "Delete data", "Supprimer les données"],
  ["حذف كل البيانات المحلية", "Delete all local data", "Supprimer toutes les données locales"],
  ["كلمة المرور", "Password", "Mot de passe"],
  ["تأكيد كلمة المرور", "Confirm password", "Confirmer le mot de passe"],
  ["تشفير وتنزيل", "Encrypt and download", "Chiffrer et télécharger"],
  ["إلغاء", "Cancel", "Annuler"],
  ["إضافة فرد من العيلة", "Add a family member", "Ajouter un membre de la famille"],
  ["صورة الشخص", "Person’s photo", "Photo de la personne"],
  ["صوت الشخص (اختياري)", "Person’s voice (optional)", "Voix de la personne (facultatif)"],
  ["🎙️ تسجيل صوت", "🎙️ Record voice", "🎙️ Enregistrer la voix"],
  ["حذف الصوت المحفوظ", "Delete saved audio", "Supprimer l’audio enregistré"],
  ["@placeholder:مثلاً: جدتي", "@placeholder:For example: my grandmother", "@placeholder:Par exemple : ma grand-mère"],
  ["العربية", "Arabic", "Arabe"],
  ["@placeholder:مثلاً: أول يوم في المدرسة", "@placeholder:For example: first day of school", "@placeholder:Par exemple : premier jour d’école"],
  ["@aria-label:إغلاق النافذة", "@aria-label:Close dialog", "@aria-label:Fermer la fenêtre"],
  ["@placeholder:P-001", "@placeholder:P-001", "@placeholder:P-001"],
  ["@aria-label:تصغير حجم النص", "@aria-label:Decrease text size", "@aria-label:Réduire la taille du texte"],
  ["@aria-label:تكبير حجم النص", "@aria-label:Increase text size", "@aria-label:Augmenter la taille du texte"],
  ["الوالد أو الوالدة في شجرة العيلة (اختياري)", "Parent in the family tree (optional)", "Parent dans l’arbre généalogique (facultatif)"],
  ["العمر بالسنوات (اختياري)", "Age in years (optional)", "Âge en années (facultatif)"],
  ["تاريخ عيد الميلاد (اختياري)", "Birthday (optional)", "Date d’anniversaire (facultatif)"],
  ["التلميح الشخصي", "Personal clue", "Indice personnel"],
  ["@placeholder:مثلاً: بتحب تحكي لنا عن رحلات زمان", "@placeholder:For example: enjoys telling us about old trips", "@placeholder:Par exemple : aime raconter ses anciens voyages"],
  ["أكلة مفضلة (اختياري)", "Favorite food (optional)", "Plat préféré (facultatif)"],
  ["أغنية مفضلة (اختياري)", "Favorite song (optional)", "Chanson préférée (facultatif)"],
  ["مكان مميز (اختياري)", "Special place (optional)", "Lieu important (facultatif)"],
  ["حفظ الشخص", "Save person", "Enregistrer la personne"],
  ["تنبيه بحثي:", "Research notice:", "Avis de recherche :"],
  ["ضعيف", "Low", "Faible"],
  ["مألوف", "Familiar", "Familier"],
  ["ملف الشخص الشخصي", "Person profile", "Profil de la personne"],
  ["اعرضوا الذكرى", "Show the memory", "Afficher le souvenir"],
  ["التالي", "Next", "Suivant"],
  ["إنهاء الجلسة", "End session", "Terminer la séance"],
  ["🔊 اسمع السؤال", "🔊 Listen to the question", "🔊 Écouter la question"],
  ["اسمع الاسم", "Listen to the name", "Écouter le nom"],
  ["تخطي السؤال", "Skip question", "Passer la question"],
  ["السؤال التالي", "Next question", "Question suivante"],
  ["ابدأ المراجعة", "Start review", "Commencer la révision"],
  ["ابدأ جلسة الذكريات", "Start a memory session", "Commencer une séance de souvenirs"],
  ["اقرؤوا الحكاية معًا", "Read the story together", "Lire le récit ensemble"],
  ["إنهاء المراجعة", "Finish review", "Terminer la révision"],
  ["انتهت المراجعة ❤️", "Review complete ❤️", "Révision terminée ❤️"],
  ["انتهت الجلسة ❤️", "Session complete ❤️", "Séance terminée ❤️"],
  ["شكرًا على الوقت الجميل ❤️", "Thank you for sharing this time ❤️", "Merci pour ce beau moment ❤️"],
  ["Smart Recall ينظم مراجعة الذكريات بتلميحات اختيارية ومواعيد متباعدة يختارها المرافق. هو أداة تذكّر مساعدة، وليس علاجًا مثبتًا للخرف أو بديلًا عن الطبيب.", "Smart Recall helps organize memory reviews with optional cues and flexible intervals chosen by a caregiver. It is a support tool, not a proven treatment for dementia or a substitute for medical care.", "Smart Recall aide à organiser la révision des souvenirs avec des indices facultatifs et des intervalles choisis par un proche. C’est un outil d’accompagnement, pas un traitement reconnu de la démence ni un remplacement des soins médicaux."],
  ["يُفضّل مشاركة شخص مألوف للمريض. استمعوا له من غير تصحيح أو ضغط؛ لو ذكرى سببت له ضيقًا، انتقلوا لذكرى مريحة أو أنهوا الجلسة. النشاط للتفاعل واستدعاء الذكريات، وليس علاجًا طبيًا أو بديلًا عن الرعاية المتخصصة.", "A familiar person should join. Listen without correcting or pressuring; if a memory causes distress, move to a comforting memory or end the session. This activity supports interaction and reminiscence; it is not medical treatment or a substitute for professional care.", "La présence d’un proche est préférable. Écoutez sans corriger ni mettre de pression ; si un souvenir provoque de la détresse, passez à un souvenir apaisant ou terminez la séance. Cette activité favorise l’échange et l’évocation, sans remplacer les soins médicaux."],
  ["الأنشطة التالية تتضمن أسئلة وقياسًا وصفيًا للجلسة البحثية. اختاروها فقط إذا كانت مناسبة للمشارك وبموافقته، ويمكن إيقافها في أي وقت.", "The following activities include questions and descriptive research-session measures. Use them only when appropriate and with the participant’s consent; they can be stopped at any time.", "Les activités suivantes comportent des questions et des mesures descriptives pour la recherche. Choisissez-les uniquement si elles conviennent au participant et avec son accord ; elles peuvent être arrêtées à tout moment."],
  ["تقدر كمان تضغط «اسمع السؤال» وقت اللعب.", "You can also press “Listen to the question” during an activity.", "Vous pouvez aussi appuyer sur « Écouter la question » pendant l’activité."],
  ["سجّل الجلسات باستخدام رمز بحثي، وبعد الحصول على الموافقات المناسبة من المشاركين وأولياء الأمور عند الحاجة.", "Record sessions using a research code, after obtaining consent from participants and guardians when needed.", "Enregistrez les séances avec un code de recherche, après avoir obtenu le consentement des participants et, si nécessaire, de leurs responsables."],
  ["كل عمود بيمثل جلسة لها دقة قابلة للحساب. الأرقام على المحور الأفقي ترتيب الجلسات المعروضة، مش تواريخها.", "Each bar represents a session with measurable accuracy. Numbers on the horizontal axis indicate display order, not dates.", "Chaque barre représente une séance dont la précision peut être calculée. Les nombres sur l’axe horizontal indiquent l’ordre d’affichage, pas les dates."],
  ["الرسم البياني غير مدعوم في هذا المتصفح.", "Charts are not supported in this browser.", "Les graphiques ne sont pas pris en charge par ce navigateur."],
  ["التطبيق مصمم لحفظ بيانات الألبوم والجلسات محليًا، ولا يرفع الصور أو التسجيلات. إعدادات التذكير تُحفظ في الخادم المحلي على هذا الجهاز وتُرسل إليه فقط.", "The app stores album and session data locally and does not upload photos or recordings. Reminder settings are stored on this device’s local server and sent only to it.", "L’application conserve localement les données de l’album et des séances, sans téléverser les photos ni les enregistrements. Les rappels sont stockés sur le serveur local de cet appareil."],
  ["الصور والتسجيلات الصوتية محفوظة محليًا لكنها غير مشفّرة. استخدم جهازًا آمنًا. النسخ الاحتياطية الجديدة مشفّرة بكلمة مرور، لكن فقدان كلمة المرور يمنع استعادتها.", "Photos and audio recordings are stored locally but are not encrypted. Use a secure device. New backups are password-encrypted; losing the password means they cannot be restored.", "Les photos et enregistrements audio sont stockés localement, sans chiffrement. Utilisez un appareil sécurisé. Les nouvelles sauvegardes sont chiffrées par mot de passe ; sans celui-ci, elles ne peuvent pas être restaurées."],
  ["إشعارات الويب تُرسل عبر خدمة الإشعارات الخاصة بالمتصفح، لذلك قد لا تصل إذا كان الجهاز مغلقًا أو غير متصل بالإنترنت.", "Web notifications use your browser’s notification service and may not arrive if the device is off or offline.", "Les notifications web passent par le service de votre navigateur et peuvent ne pas arriver si l’appareil est éteint ou hors ligne."],
  ["دي تجربة محلية على الجهاز ده. لازم تسيبي الخادم المحلي شغال عشان يرسل التذكيرات؛ مزامنة أجهزة تانية تحتاج استضافة لاحقًا.", "Reminders run locally on this device. Keep the local server running to send them; syncing other devices requires hosting.", "Les rappels fonctionnent localement sur cet appareil. Laissez le serveur local actif ; la synchronisation d’autres appareils nécessitera un hébergement."],
  ["إشعار المتصفح لا يشغّل الصوت تلقائيًا. عند فتحه، تظهر الذكرى المختارة على هذا الجهاز ويمكن تشغيل الصوت يدويًا.", "Browser notifications do not play audio automatically. Opening one shows the selected memory on this device, where audio can be played manually.", "Les notifications ne lancent pas l’audio automatiquement. En ouvrant une notification, le souvenir choisi s’affiche sur cet appareil et l’audio peut être lancé manuellement."],
  ["أضيفوا حكاية وصورة من قسم حكايات العيلة لاستخدامها في التذكير.", "Add a story and photo in Family Stories to use with a reminder.", "Ajoutez un récit et une photo dans les récits familiaux pour les associer à un rappel."],
  ["تم تحميل جدول التذكير المحفوظ.", "Saved reminder schedule loaded.", "Programmation des rappels chargée."],
  ["تقليل التكرار لو الإشعارات متتفتحش", "Reduce reminders if notifications are not opened", "Réduire les rappels si les notifications ne sont pas ouvertes"],
  ["ابدأي الخادم المحلي ثم افتحي التطبيق من العنوان الذي يظهر في نافذة التشغيل.", "Start the local server, then open the app at the address shown in its terminal.", "Démarrez le serveur local, puis ouvrez l’application à l’adresse indiquée dans le terminal."],
  ["عدّل حجم النص أو فعّل التباين العالي لراحة أكبر.", "Adjust text size or enable high contrast for more comfort.", "Ajustez la taille du texte ou activez le contraste élevé pour plus de confort."],
  ["النسخة الاحتياطية تتضمن الأفراد والحكايات والصور والتسجيلات والجلسات، وتُشفّر بكلمة مرور قبل تنزيلها. احتفظ بكلمة المرور في مكان آمن.", "The backup includes family members, stories, photos, recordings, and sessions. It is encrypted with a password before download; keep the password safe.", "La sauvegarde comprend les membres, récits, photos, enregistrements et séances. Elle est chiffrée par mot de passe avant le téléchargement ; conservez ce mot de passe en lieu sûr."],
  ["حذف البيانات من داخل التطبيق لا يحذف النسخ الاحتياطية اللي سبق تصديرها إلى جهازك.", "Deleting data in the app does not remove backups previously exported to your device.", "La suppression des données dans l’application n’efface pas les sauvegardes déjà exportées sur votre appareil."],
  ["ذاكرتي نموذج أولي لأنشطة التذكّر والتفاعل وجمع بيانات وصفية عن بعض الألعاب. مش علاجًا للزهايمر أو أداة تشخيص، ولا تغني عن الرعاية الطبية المتخصصة.", "Zakerty is a prototype for memory and interaction activities and descriptive game data. It is not a treatment for Alzheimer’s, a diagnostic tool, or a substitute for professional medical care.", "Zakerty est un prototype d’activités de mémoire et d’interaction, avec des données descriptives sur certains jeux. Ce n’est ni un traitement de la maladie d’Alzheimer, ni un outil de diagnostic, ni un remplacement des soins médicaux."],
  ["اختاروا كلمة مرور لا تقل عن 8 أحرف. لن نستطيع استعادة النسخة من دونها.", "Choose a password with at least 8 characters. The backup cannot be restored without it.", "Choisissez un mot de passe d’au moins 8 caractères. Sans celui-ci, la sauvegarde ne pourra pas être restaurée."],
  ["استخدم صورة أو تسجيلًا صوتيًا بعد موافقة صاحبه، وأضف معلومات مناسبة يوافق عليها.", "Use a photo or voice recording with the person’s consent, and add information they agree to share.", "Utilisez une photo ou un enregistrement avec l’accord de la personne, et ajoutez uniquement des informations qu’elle accepte de partager."],
  ["الصورة بتتحفظ محليًا على الجهاز.", "The photo is saved locally on this device.", "La photo est enregistrée localement sur cet appareil."],
  ["اختاري ملفًا صوتيًا أو سجّلي مقطعًا قصيرًا (حتى 30 ثانية). التسجيل يُحفظ على هذا الجهاز فقط.", "Choose an audio file or record a short clip (up to 30 seconds). It is saved only on this device.", "Choisissez un fichier audio ou enregistrez un court extrait (30 secondes max.). Il est conservé sur cet appareil uniquement."],
  ["اختاروا فردًا أكبر مرتبطًا به ليظهر تحته في الشجرة، أو اتركوه بلا اختيار.", "Choose an older relative to appear above this person in the tree, or leave it blank.", "Choisissez un membre plus âgé qui apparaîtra au-dessus dans l’arbre, ou laissez ce champ vide."],
  ["اختاري أي سنة؛ نحتفظ بالتاريخ المختار ويكون التذكير سنويًا حسب اليوم والشهر.", "Choose any year; the selected date is saved, and the reminder repeats yearly by day and month.", "Choisissez n’importe quelle année ; la date est conservée et le rappel revient chaque année au même jour et mois."],
  ["تخطي", "Skip", "Passer"],
  ["رتّب أفراد العيلة من الأكبر للأصغر حسب العمر المدخل. تقدر تحرّك كل اسم لفوق أو لتحت.", "Arrange family members from oldest to youngest using the ages provided. Move each name up or down.", "Classez les membres du plus âgé au plus jeune selon les âges indiqués. Déplacez chaque nom vers le haut ou le bas."],
  ["حفظ النتيجة", "Save result", "Enregistrer le résultat"],
  ["عرض النتائج", "View results", "Voir les résultats"],
  ["اسمع السؤال", "Listen to the question", "Écouter la question"],
  ["المعلومة تساعد على التذكّر", "A clue to help remember", "Un indice pour aider à se souvenir"],
  ["تلميح: اسمع الاسم", "Hint: listen to the name", "Indice : écouter le nom"],
  ["تلميح يساعد على التذكر", "A clue to help you remember", "Un indice pour vous aider à vous souvenir"],
  ["مافيش إجابة غلط", "There are no wrong answers", "Il n’y a pas de mauvaise réponse"],
  ["العودة للأنشطة", "Back to activities", "Retour aux activités"],
  ["عودة", "Back", "Retour"],
  ["جلسة ذكريات هادئة 🌿", "Calm memory session 🌿", "Séance de souvenirs paisible 🌿"],
  ["خدوا وقتكم. مفيش إجابة مطلوبة، وممكن تتفرجوا أو تسمعوا بس.", "Take your time. No answer is required; you can simply look or listen.", "Prenez votre temps. Aucune réponse n’est nécessaire ; vous pouvez simplement regarder ou écouter."],
  ["Smart Recall · مراجعة هادئة", "Smart Recall · Calm review", "Smart Recall · Révision paisible"],
  ["Smart Recall ينظم مراجعة الذكريات بتلميحات ومواعيد متباعدة يختارها المرافق. هو أداة تذكّر مساعدة، وليس علاجًا مثبتًا للخرف أو بديلًا عن الطبيب.", "Smart Recall organizes memory reviews with optional cues and flexible intervals chosen by the caregiver. It is a support tool, not a proven dementia treatment or a substitute for medical care.", "Smart Recall organise les révisions avec des indices facultatifs et des intervalles souples choisis par un proche. C’est un outil d’accompagnement, pas un traitement reconnu de la démence ni un remplacement des soins médicaux."],
  ["اختاروا نشاطًا مناسبًا. جلسة الذكريات هادئة، من غير توقيت أو إجابات صح وغلط، وممكن تنهوها في أي وقت.", "Choose an activity that feels right. Memory sessions are calm, untimed, have no right or wrong answers, and can end at any time.", "Choisissez une activité adaptée. Les séances sont paisibles, sans minuterie ni bonne ou mauvaise réponse, et peuvent s’arrêter à tout moment."],
  ["فاكر الحكاية؟", "Remember the story?", "Vous souvenez-vous du récit ?"],
  ["اقرأ المعلومة وحاول تعرف مين الشخص المقصود.", "Read the clue and try to identify the person.", "Lisez l’indice et essayez de trouver la personne concernée."],
  ["دي ذكرى مرتبطة بـ", "This memory is connected to", "Ce souvenir est lié à"],
  ["لو حابين، احكوا مع بعض عن الصورة أو الإحساس اللي بتفكّركم بيه.", "If you like, talk together about the photo or the feeling it brings back.", "Si vous le souhaitez, parlez ensemble de la photo ou des émotions qu’elle évoque."],
  ["ممكن تكتفوا بمشاهدة الصورة معًا.", "You can simply look at the photo together.", "Vous pouvez simplement regarder la photo ensemble."],
  ["نقدر نكتفوا بمشاهدة الصورة معًا.", "We can simply look at the photo together.", "Nous pouvons simplement regarder la photo ensemble."],
  ["انتقلوا لذكرى مريحة أو أنهوا الجلسة.", "Move to a comforting memory or end the session.", "Passez à un souvenir apaisant ou terminez la séance."],
  ["ابدأوا بالصورة وخدوا وقتكم. مفيش إجابة غلط؛ المرافق يختار التلميح المناسب.", "Start with the photo and take your time. There are no wrong answers; the caregiver can choose a helpful clue.", "Commencez par la photo et prenez votre temps. Il n’y a pas de mauvaise réponse ; un proche peut choisir un indice adapté."],
  ["Smart Recall · مراجعة هادئة", "Smart Recall · A calm review", "Smart Recall · Révision paisible"],
  ["مفيش ذكرى مستحقة للمراجعة اليوم. يمكنكم مراجعة واحدة مبكرًا أو العودة لاحقًا.", "No memories are due for review today. You can review one early or come back later.", "Aucun souvenir n’est à revoir aujourd’hui. Vous pouvez en revoir un à l’avance ou revenir plus tard."],
  ["ابدأوا بالصورة وخدوا وقتكم. مفيش إجابة غلط؛ المرافق يختار التلميح المناسب.", "Start with the photo and take your time. There are no wrong answers; the caregiver can choose a helpful clue.", "Commencez par la photo et prenez votre temps. Il n’y a pas de mauvaise réponse ; un proche peut choisir un indice adapté."],
  ["هل الصورة دي مألوفة؟ استنوا براحتكم، أو افتحوا تلميحًا.", "Does this photo feel familiar? Take your time, or reveal a clue.", "Cette photo vous semble-t-elle familière ? Prenez votre temps ou affichez un indice."],
  ["دي حكاية مرتبطة بـ", "This is a story about", "Ce récit est lié à"],
  ["نقدر نقرأ الحكاية معًا.", "We can read the story together.", "Nous pouvons lire le récit ensemble."],
  ["ذكرى تانية", "Another memory", "Un autre souvenir"],
  ["اختاروا موعد الرجوع للذكرى، حسب اللي كان مريحًا", "Choose when to revisit this memory, based on what felt comfortable", "Choisissez quand revoir ce souvenir, selon ce qui était confortable"],
  ["كانت مألوفة", "It felt familiar", "Le souvenir était familier"],
  ["احتجنا تلميحًا", "We needed a clue", "Nous avons eu besoin d’un indice"],
  ["قرأنا أو سمعنا الحكاية", "We read or listened to the story", "Nous avons lu ou écouté le récit"],
  ["المواعيد للتنظيم فقط حسب مقدار المساعدة، ومش درجات أو قياسًا طبيًا. اتركوا الذكرى بلا موعد لو تحبوا.", "These dates are only for organizing reviews according to the support needed—not scores or medical measures. You can leave a memory unscheduled.", "Ces dates servent uniquement à organiser les révisions selon l’aide nécessaire ; ce ne sont ni des scores ni des mesures médicales. Vous pouvez ne pas programmer un souvenir."],
  ["شكرًا على مشاركة الذكريات. يمكنكم الرجوع لها في أي وقت، من غير درجات أو تقييم.", "Thank you for sharing these memories. You can return to them anytime, with no scores or evaluation.", "Merci d’avoir partagé ces souvenirs. Vous pouvez les retrouver à tout moment, sans score ni évaluation."],
  ["ولا يهمك، الإجابة هي", "That’s okay. The answer is", "Ce n’est pas grave. La réponse est"],
  ["إجابة صحيحة، برافو! ❤️", "That’s right—well done! ❤️", "Bonne réponse, bravo ! ❤️"],
  ["الترتيب صحيح! أحسنت. ❤️", "That order is right—well done! ❤️", "Le classement est correct, bravo ! ❤️"],
  ["لسه فيه اختلاف بسيط. جرّب تاني براحتك.", "There’s a small difference. Take your time and try again.", "Il y a encore une petite différence. Prenez votre temps et réessayez."],
  ["ابدأوا حكاية عائلية، وارجعوا لها معًا وقت ما تحبوا.", "Add a family story and revisit it together whenever you like.", "Ajoutez un récit familial et retrouvez-le ensemble quand vous le souhaitez."],
  ["أضيفوا يوم وشهر الميلاد لشخص عشان يظهر هنا.", "Add a family member’s birth day and month to see it here.", "Ajoutez le jour et le mois de naissance d’un proche pour l’afficher ici."],
  ["أضفوا يوم وشهر الميلاد لشخص عشان يظهر هنا.", "Add a family member’s birth day and month to see it here.", "Ajoutez le jour et le mois de naissance d’un proche pour l’afficher ici."],
  ["التسجيل التالي", "Next recording", "Enregistrement suivant"],
  ["تخطي التسجيل", "Skip recording", "Passer l’enregistrement"],
  ["تحقق من الترتيب", "Check the order", "Vérifier l’ordre"],
  ["اقرأوا الحكاية معًا", "Read the story together", "Lire le récit ensemble"],
  ["إنهاء الجلسة الآن", "End the session now", "Terminer la séance maintenant"],
  ["لا توجد حكاية مضافة بعد.", "No story has been added yet.", "Aucun récit n’a encore été ajouté."],
  ["فرد غير موجود في الألبوم", "Person not found in the album", "Personne introuvable dans l’album"],
  ["بدون ربط", "No parent link", "Aucun lien parental"],
  ["تشغيل الصوت غير مدعوم في هذا المتصفح.", "Audio playback is not supported in this browser.", "La lecture audio n’est pas prise en charge par ce navigateur."],
  ["التعرّف على الكلام غير مدعوم هنا. استخدموا الأزرار أو لوحة المفاتيح.", "Speech recognition is not supported here. Use the buttons or keyboard instead.", "La reconnaissance vocale n’est pas prise en charge ici. Utilisez les boutons ou le clavier."],
  ["لم أسمع كلامًا واضحًا. حاولوا مرة أخرى أو استخدموا الأزرار.", "I could not hear that clearly. Try again or use the buttons.", "Je n’ai pas bien compris. Réessayez ou utilisez les boutons."],
  ["تعذر تشغيل الميكروفون. استخدموا الأزرار المتاحة.", "Could not start the microphone. Use the available buttons.", "Impossible de démarrer le micro. Utilisez les boutons disponibles."],
  ["أُضيف الكلام إلى نص الحكاية. راجعوه قبل الحفظ.", "The recognized words were added to the story. Review them before saving.", "Le texte reconnu a été ajouté au récit. Relisez-le avant de l’enregistrer."]
];
const translationMap = new Map(
  translationRows.flatMap(([arabic, english, french]) => [
    [arabic, { en: english, fr: french }]
  ])
);

const state = {
  people: readStorage(STORAGE_KEY, []),
  sessions: readStorage(SESSIONS_KEY, []),
  stories: readStorage(STORIES_KEY, []),
  currentGame: null,
  game: null,
  memoryJourney: null,
  smartRecall: null,
  editingPersonId: null,
  autoReadQuestions: readStorage(VOICE_SETTING_KEY, false) === true,
  pendingPersonAudio: null,
  removePersonAudio: false,
  mediaRecorder: null,
  recordingStream: null,
  recordingChunks: [],
  recordingTimeout: null,
  pendingStoryAudio: null,
  storyRecorder: null,
  storyRecordingStream: null,
  storyRecordingChunks: [],
  storyRecordingTimeout: null,
  activeMemoryActions: null,
  activeSpeechRecognition: null,
  reminderMemoryId: readStorage(REMINDER_MEMORY_KEY, ""),
  reminderPreviewToken: 0
};

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getAccessibilitySettings() {
  const saved = readStorage(ACCESSIBILITY_KEY, {});
  return { ...ACCESSIBILITY_DEFAULTS, ...(saved && typeof saved === "object" ? saved : {}) };
}

function getLocaleTag() {
  return {
    ar: "ar-EG",
    en: "en-US",
    fr: "fr-FR"
  }[getAccessibilitySettings().language] || "ar-EG";
}

function translatedPhrase(source, language = getAccessibilitySettings().language) {
  if (language === "ar") return source;
  const phrase = source.trim().replace(/\s+/g, " ");
  const exact = translationMap.get(phrase)?.[language];
  if (exact) return exact;

  const recallProgress = phrase.match(/^ذكرى (\d+) من (\d+)$/);
  if (recallProgress) {
    return language === "fr"
      ? `Souvenir ${recallProgress[1]} sur ${recallProgress[2]}`
      : `Memory ${recallProgress[1]} of ${recallProgress[2]}`;
  }
  const questionProgress = phrase.match(/^السؤال (\d+) من (\d+)$/);
  if (questionProgress) {
    return language === "fr"
      ? `Question ${questionProgress[1]} sur ${questionProgress[2]}`
      : `Question ${questionProgress[1]} of ${questionProgress[2]}`;
  }
  const weeklyMemory = phrase.match(
    /^لو الوقت مناسب، افتحوا «(.+)» واستمتعوا بذكرى العيلة سوا\.$/
  );
  if (weeklyMemory) {
    return language === "fr"
      ? `Si le moment vous convient, ouvrez « ${weeklyMemory[1]} » et profitez ensemble de ce souvenir.`
      : `If it feels like a good time, open “${weeklyMemory[1]}” and enjoy this memory together.`;
  }
  const todayBirthday = phrase.match(/^النهارده · (.+)$/);
  if (todayBirthday) {
    return language === "fr"
      ? `Aujourd’hui · ${todayBirthday[1]}`
      : `Today · ${todayBirthday[1]}`;
  }
  const tomorrowBirthday = phrase.match(/^بكرة · (.+)$/);
  if (tomorrowBirthday) {
    return language === "fr"
      ? `Demain · ${tomorrowBirthday[1]}`
      : `Tomorrow · ${tomorrowBirthday[1]}`;
  }
  const upcomingBirthday = phrase.match(/^بعد (\d+) يوم · (.+)$/);
  if (upcomingBirthday) {
    return language === "fr"
      ? `Dans ${upcomingBirthday[1]} jour(s) · ${upcomingBirthday[2]}`
      : `In ${upcomingBirthday[1]} day(s) · ${upcomingBirthday[2]}`;
  }
  const whoQuestion = phrase.match(
    /^مين ده؟ اختار الاسم المناسب للصورة\. السؤال (\d+) من (\d+)\.$/
  );
  if (whoQuestion) {
    return language === "fr"
      ? `Qui est-ce ? Choisissez le nom correspondant à la photo. Question ${whoQuestion[1]} sur ${whoQuestion[2]}.`
      : `Who is this? Choose the name that matches the photo. Question ${whoQuestion[1]} of ${whoQuestion[2]}.`;
  }
  return source;
}

function translatedAttribute(source, attribute, language) {
  const key = `@${attribute}:${source.trim()}`;
  if (language === "ar") return source;
  return translationMap.get(key)?.[language] || source;
}

function applyTextTranslation(node, language) {
  let source = textSources.get(node);
  if (source === undefined || node.nodeValue !== translatedText.get(node)) {
    source = node.nodeValue;
    textSources.set(node, source);
  }
  const leading = source.match(/^\s*/)?.[0] || "";
  const trailing = source.match(/\s*$/)?.[0] || "";
  const content = source.slice(leading.length, source.length - trailing.length);
  const translated = translatedPhrase(content, language);
  const value = content ? `${leading}${translated}${trailing}` : source;
  if (node.nodeValue !== value) node.nodeValue = value;
  translatedText.set(node, value);
}

function applyAttributeTranslations(element, language) {
  let savedAttributes = attributeSources.get(element);
  if (!savedAttributes) {
    savedAttributes = new Map();
    attributeSources.set(element, savedAttributes);
  }
  ["aria-label", "placeholder", "title", "alt"].forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    let saved = savedAttributes.get(attribute);
    const current = element.getAttribute(attribute);
    if (!saved || current !== saved.translated) {
      saved = { source: current, translated: current };
      savedAttributes.set(attribute, saved);
    }
    saved.translated = translatedAttribute(saved.source, attribute, language);
    if (current !== saved.translated) {
      element.setAttribute(attribute, saved.translated);
    }
  });
}

function translateSubtree(root, language) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyTextTranslation(root, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) applyAttributeTranslations(root, language);
  root.childNodes.forEach((child) => translateSubtree(child, language));
}

function applyLanguageSettings(language = getAccessibilitySettings().language) {
  const selectedLanguage = ["ar", "en", "fr"].includes(language) ? language : "ar";
  const languageTag = { ar: "ar", en: "en", fr: "fr" }[selectedLanguage];
  document.documentElement.lang = languageTag;
  document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
  document.title = translatedPhrase("ذاكرتي | Zakerty", selectedLanguage);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = getAccessibilitySettings().theme === "dark"
    ? "#171a19"
    : "#315c55";
  if (currentTranslationLanguage !== selectedLanguage) {
    translateSubtree(document.body, selectedLanguage);
    currentTranslationLanguage = selectedLanguage;
  }

  if (!translationObserver && "MutationObserver" in window) {
    translationObserver = new MutationObserver((records) => {
      const currentLanguage = getAccessibilitySettings().language;
      records.forEach((record) => {
        record.addedNodes.forEach((node) => translateSubtree(node, currentLanguage));
      });
    });
    translationObserver.observe(document.body, { childList: true, subtree: true });
  }
}

function difficultyName(difficulty) {
  const names = {
    easy: ["سهل", "Easy", "Facile"],
    normal: ["متوسط", "Medium", "Moyen"],
    hard: ["تحدي", "Challenge", "Défi"]
  };
  const languageIndex = { ar: 0, en: 1, fr: 2 }[getAccessibilitySettings().language] || 0;
  return names[difficulty]?.[languageIndex] || "—";
}

function savePeople() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.people));
}

function saveSessions() {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(state.sessions));
}

function saveStories() {
  localStorage.setItem(STORIES_KEY, JSON.stringify(state.stories));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

/* IndexedDB photo storage */

function openPhotoDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("المتصفح لا يدعم تخزين الصور محليًا."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORY_AUDIO_STORE)) {
        db.createObjectStore(STORY_AUDIO_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePhoto(id, blob) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readwrite");
    transaction.objectStore(PHOTO_STORE).put({ id, blob });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getPhoto(id) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readonly");
    const request = transaction.objectStore(PHOTO_STORE).get(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result?.blob || null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function saveAudio(id, blob) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    transaction.objectStore(AUDIO_STORE).put({ id, blob });
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getAudio(id) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly");
    const request = transaction.objectStore(AUDIO_STORE).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.blob || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteAudio(id) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    transaction.objectStore(AUDIO_STORE).delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function saveStoryAudio(id, blob) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORY_AUDIO_STORE, "readwrite");
    transaction.objectStore(STORY_AUDIO_STORE).put({ id, blob });
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getStoryAudio(id) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORY_AUDIO_STORE, "readonly");
    const request = transaction.objectStore(STORY_AUDIO_STORE).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.blob || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteStoryAudio(id) {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORY_AUDIO_STORE, "readwrite");
    transaction.objectStore(STORY_AUDIO_STORE).delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getMemoryAudio(story, person) {
  if (story.hasAudio) return getStoryAudio(story.id);
  if (person?.hasAudio) return getAudio(person.id);
  return null;
}

async function deletePhoto(id) {
  try {
    const db = await openPhotoDB();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, "readwrite");
      transaction.objectStore(PHOTO_STORE).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch (error) {
    console.error("Photo deletion failed:", error);
  }
}

async function photoUrl(id) {
  const blob = await getPhoto(id);
  return blob ? URL.createObjectURL(blob) : "";
}

function revokeImageUrls(container = document) {
  container.querySelectorAll("[data-object-url]").forEach((element) => {
    if (element.dataset.objectUrl) {
      URL.revokeObjectURL(element.dataset.objectUrl);
    }
  });
}

/* Navigation */

async function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("hidden", page.id !== pageId);
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    const active = button.dataset.go === pageId;
    button.classList.toggle("active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (pageId === "family") renderFamily();
  if (pageId === "stories") await renderStories();
  if (pageId === "research") renderResearch();
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

/* Family members */

const personDialog = $("#personDialog");
const personForm = $("#personForm");
const personImage = $("#personImage");
const personBirthday = $("#personBirthday");
const personAudio = $("#personAudio");
const audioStatus = $("#personAudioStatus");
const startAudioRecording = $("#startAudioRecording");
const stopAudioRecording = $("#stopAudioRecording");
const removePersonAudioButton = $("#removePersonAudio");
const canRecordAudio = Boolean(
  navigator.mediaDevices?.getUserMedia && window.MediaRecorder
);

if (!canRecordAudio) {
  startAudioRecording.disabled = true;
  audioStatus.textContent =
    "التسجيل بالميكروفون غير مدعوم هنا؛ اختاري ملفًا صوتيًا. التسجيل يحتاج متصفحًا حديثًا واتصالًا آمنًا.";
}

function resetPersonAudioForm() {
  state.pendingPersonAudio = null;
  state.removePersonAudio = false;
  personAudio.value = "";
  stopAudioRecording.disabled = true;
  startAudioRecording.disabled = !canRecordAudio;
  removePersonAudioButton.classList.add("hidden");
  audioStatus.textContent = canRecordAudio
    ? "اختاري ملفًا صوتيًا أو سجّلي مقطعًا قصيرًا (حتى 30 ثانية). التسجيل يُحفظ على هذا الجهاز فقط."
    : "التسجيل بالميكروفون غير مدعوم هنا؛ اختاري ملفًا صوتيًا. التسجيل يحتاج متصفحًا حديثًا واتصالًا آمنًا.";
}

function stopRecordingStream() {
  if (state.recordingTimeout) {
    clearTimeout(state.recordingTimeout);
    state.recordingTimeout = null;
  }
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
  }
  state.recordingStream?.getTracks().forEach((track) => track.stop());
  state.recordingStream = null;
  state.mediaRecorder = null;
  stopAudioRecording.disabled = true;
  startAudioRecording.disabled = !canRecordAudio;
}

startAudioRecording.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    audioStatus.textContent = "تسجيل الصوت غير مدعوم؛ اختاري ملفًا صوتيًا بدلًا منه.";
    return;
  }

  startAudioRecording.disabled = true;
  audioStatus.textContent = "اسمحي باستخدام الميكروفون لبدء التسجيل.";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordingStream = stream;
    state.recordingChunks = [];

    const preferredType = "audio/webm;codecs=opus";
    const options = typeof MediaRecorder.isTypeSupported === "function" &&
      MediaRecorder.isTypeSupported(preferredType)
      ? { mimeType: preferredType }
      : undefined;
    const recorder = new MediaRecorder(stream, options);
    state.mediaRecorder = recorder;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) state.recordingChunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      if (state.recordingTimeout) {
        clearTimeout(state.recordingTimeout);
        state.recordingTimeout = null;
      }
      const recording = new Blob(state.recordingChunks, {
        type: recorder.mimeType || "audio/webm"
      });
      state.recordingChunks = [];

      if (recording.size > MAX_AUDIO_SIZE) {
        state.pendingPersonAudio = null;
        audioStatus.textContent = "التسجيل أكبر من 12 ميجابايت. سجّلي مقطعًا أقصر.";
      } else if (recording.size) {
        state.pendingPersonAudio = recording;
        state.removePersonAudio = false;
        audioStatus.textContent = "تم تجهيز التسجيل. احفظي بيانات الشخص لتخزينه.";
      } else {
        audioStatus.textContent = "التسجيل فارغ. حاولي تسجيله مرة أخرى.";
      }

      state.recordingStream?.getTracks().forEach((track) => track.stop());
      state.recordingStream = null;
      state.mediaRecorder = null;
      stopAudioRecording.disabled = true;
      startAudioRecording.disabled = false;
    });

    recorder.start();
    stopAudioRecording.disabled = false;
    audioStatus.textContent = "جاري التسجيل… الحد الأقصى 30 ثانية.";
    state.recordingTimeout = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_RECORDING_MS);
  } catch (error) {
    console.error("Could not start voice recording:", error);
    state.recordingStream?.getTracks().forEach((track) => track.stop());
    state.recordingStream = null;
    startAudioRecording.disabled = false;
    audioStatus.textContent =
      "تعذر الوصول للميكروفون. راجعي إذن المتصفح أو اختاري ملفًا صوتيًا.";
  }
});

stopAudioRecording.addEventListener("click", stopRecordingStream);
personDialog.addEventListener("close", stopRecordingStream);

personAudio.addEventListener("change", () => {
  const file = personAudio.files[0];
  if (!file) {
    state.pendingPersonAudio = null;
    const editingPerson = state.people.find(
      (person) => person.id === state.editingPersonId
    );
    audioStatus.textContent = editingPerson?.hasAudio && !state.removePersonAudio
      ? "يوجد تسجيل صوتي محفوظ."
      : canRecordAudio
        ? "اختاري ملفًا صوتيًا أو سجّلي مقطعًا قصيرًا (حتى 30 ثانية)."
        : "التسجيل بالميكروفون غير مدعوم هنا؛ اختاري ملفًا صوتيًا.";
    return;
  }
  state.pendingPersonAudio = file;
  state.removePersonAudio = false;
  audioStatus.textContent = `الصوت المختار: ${file.name}. احفظي بيانات الشخص لتخزينه.`;
});

removePersonAudioButton.addEventListener("click", () => {
  state.pendingPersonAudio = null;
  personAudio.value = "";
  state.removePersonAudio = true;
  audioStatus.textContent = "سيُحذف التسجيل الصوتي عند حفظ بيانات الشخص.";
});

$("#addPersonBtn")?.addEventListener("click", () => {
  state.editingPersonId = null;
  personForm.reset();
  populateFamilyParentOptions();
  resetPersonAudioForm();
  personImage.required = true;
  $("#personDialogTitle").textContent = "إضافة فرد من العيلة";
  personImage.nextElementSibling.textContent = "الصورة بتتحفظ محليًا على الجهاز.";
  personDialog.showModal();
});

$("#closePersonDialog")?.addEventListener("click", () => {
  personDialog.close();
});

$("#cancelPerson")?.addEventListener("click", () => {
  personDialog.close();
});

personForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("#personName").value.trim();
  const relation = $("#personRelation").value.trim();
  const ageValue = $("#personAge").value;
  const note = $("#personNote").value.trim();
  const favoriteFood = $("#personFavoriteFood").value.trim();
  const favoriteSong = $("#personFavoriteSong").value.trim();
  const importantPlace = $("#personImportantPlace").value.trim();
  const file = personImage.files[0];
  const audioBlob = state.pendingPersonAudio;
  const editingPerson = state.people.find(
    (person) => person.id === state.editingPersonId
  );

  if (!name || !relation || (!file && !editingPerson)) {
    alert("اكتبي الاسم ودرجة القرابة واختاري صورة للشخص.");
    return;
  }

  if (file && !file.type.startsWith("image/")) {
    alert("اختاري ملف صورة صالح.");
    return;
  }

  if (file && file.size > 12 * 1024 * 1024) {
    alert("الصورة كبيرة جدًا. اختاري صورة أقل من 12 ميجابايت.");
    return;
  }

  if (audioBlob && !audioBlob.type.startsWith("audio/")) {
    alert("اختاري ملفًا صوتيًا صالحًا.");
    return;
  }

  if (audioBlob && audioBlob.size > MAX_AUDIO_SIZE) {
    alert("ملف الصوت كبير جدًا. اختاري ملفًا أقل من 12 ميجابايت.");
    return;
  }

  const id = editingPerson?.id || makeId();
  let previousPhoto = null;
  let previousAudio = null;
  let photoChanged = false;
  let audioChanged = false;

  try {
    if (file) {
      if (editingPerson) previousPhoto = await getPhoto(id);
      await savePhoto(id, file);
      photoChanged = true;
    }
    if (editingPerson && (audioBlob || state.removePersonAudio)) {
      previousAudio = await getAudio(id);
    }
    if (audioBlob) {
      await saveAudio(id, audioBlob);
      audioChanged = true;
    } else if (state.removePersonAudio) {
      await deleteAudio(id);
      audioChanged = true;
    }

    const updatedPerson = {
      id,
      name,
      relation,
      parentId: $("#personParent").value || "",
      age: ageValue ? Number(ageValue) : null,
      note,
      favoriteFood,
      favoriteSong,
      importantPlace,
      birthday: personBirthday.value,
      hasAudio: audioBlob
        ? true
        : Boolean(editingPerson?.hasAudio && !state.removePersonAudio),
      createdAt: new Date().toISOString()
    };

    const candidatePeople = editingPerson
      ? state.people.map((person) => person.id === id ? updatedPerson : person)
      : [...state.people, updatedPerson];
    validateFamilyTree(candidatePeople);

    if (editingPerson) {
      updatedPerson.createdAt = editingPerson.createdAt;
      state.people = state.people.map((person) =>
        person.id === id ? updatedPerson : person
      );
    } else {
      state.people.push(updatedPerson);
    }

    try {
      savePeople();
    } catch (error) {
      if (editingPerson) {
        state.people = state.people.map((person) =>
          person.id === id ? editingPerson : person
        );
      } else {
        state.people = state.people.filter((person) => person.id !== id);
      }
      throw error;
    }

    personDialog.close();
    personForm.reset();
    resetPersonAudioForm();
    personImage.required = true;
    state.editingPersonId = null;
    await renderFamily();
    updateHome();
  } catch (error) {
    try {
      if (photoChanged) {
        if (editingPerson && previousPhoto) await savePhoto(id, previousPhoto);
        else await deletePhoto(id);
      }
      if (audioChanged) {
        if (previousAudio) await saveAudio(id, previousAudio);
        else await deleteAudio(id);
      }
    } catch (rollbackError) {
      console.error("Could not roll back person media after save failure:", rollbackError);
    }
    console.error(error);
    alert("محصلش حفظ للبيانات. اتأكدي من مساحة التخزين وحاولي تاني.");
  }
});

function openPersonEditor(id) {
  const person = state.people.find((item) => item.id === id);
  if (!person) return;

  state.editingPersonId = id;
  resetPersonAudioForm();
  $("#personDialogTitle").textContent = "تعديل بيانات فرد من العيلة";
  $("#personName").value = person.name;
  $("#personRelation").value = person.relation;
  populateFamilyParentOptions(person);
  $("#personParent").value = person.parentId || "";
  $("#personAge").value = Number.isFinite(person.age) ? person.age : "";
  $("#personNote").value = person.note || "";
  $("#personFavoriteFood").value = person.favoriteFood || "";
  $("#personFavoriteSong").value = person.favoriteSong || "";
  $("#personImportantPlace").value = person.importantPlace || "";
  personBirthday.value = person.birthday
    ? birthdayInputValue(person.birthday)
    : "";
  personImage.value = "";
  personImage.required = false;
  personImage.nextElementSibling.textContent =
    "اختياري: اختار صورة جديدة لاستبدال الصورة الحالية.";
  if (person.hasAudio) {
    removePersonAudioButton.classList.remove("hidden");
    audioStatus.textContent = "يوجد تسجيل صوتي محفوظ. اختاري ملفًا جديدًا لاستبداله أو احذفيه.";
  }
  personDialog.showModal();
}

function getFamilyDescendants(personId) {
  const descendants = new Set();
  const pending = [personId];
  while (pending.length) {
    const parentId = pending.pop();
    state.people.forEach((person) => {
      if (person.parentId === parentId && !descendants.has(person.id)) {
        descendants.add(person.id);
        pending.push(person.id);
      }
    });
  }
  return descendants;
}

function populateFamilyParentOptions(person = null) {
  const select = $("#personParent");
  if (!select) return;
  select.replaceChildren();
  const rootOption = document.createElement("option");
  rootOption.value = "";
  rootOption.textContent = "بدون ربط";
  select.append(rootOption);

  const excluded = person
    ? new Set([person.id, ...getFamilyDescendants(person.id)])
    : new Set();
  state.people
    .filter((member) => !excluded.has(member.id))
    .forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = `${member.name} — ${member.relation}`;
      select.append(option);
    });
}

function validateFamilyTree(people) {
  const byId = new Map(people.map((person) => [person.id, person]));
  for (const person of people) {
    if (person.parentId && (!byId.has(person.parentId) || person.parentId === person.id)) {
      throw new Error(`صلة شجرة العيلة للشخص ${person.name} غير صالحة.`);
    }
  }

  const checked = new Set();
  function visit(personId, path) {
    if (path.has(personId)) {
      throw new Error("روابط شجرة العيلة تحتوي على حلقة. راجعوا اختيار الوالد أو الوالدة.");
    }
    if (checked.has(personId)) return;
    const person = byId.get(personId);
    if (!person?.parentId) {
      checked.add(personId);
      return;
    }
    path.add(personId);
    visit(person.parentId, path);
    path.delete(personId);
    checked.add(personId);
  }

  people.forEach((person) => visit(person.id, new Set()));
}

async function renderFamily() {
  const list = $("#familyList");
  const empty = $("#familyEmpty");
  const noResults = $("#familyNoResults");

  if (!list || !empty) return;

  revokeImageUrls(list);
  list.replaceChildren();

  const query = ($("#familySearch")?.value || "").trim().toLocaleLowerCase("ar");
  const sortBy = $("#familySort")?.value || "name";
  const people = state.people.filter((person) => (
    `${person.name} ${person.relation} ${person.favoriteFood || ""} ` +
    `${person.favoriteSong || ""} ${person.importantPlace || ""}`
  ).toLocaleLowerCase("ar").includes(query));

  people.sort((first, second) => {
    if (sortBy === "age") {
      return (Number.isFinite(second.age) ? second.age : -1) -
        (Number.isFinite(first.age) ? first.age : -1);
    }
    if (sortBy === "birthday") {
      return birthdayDaysAway(first.birthday) - birthdayDaysAway(second.birthday);
    }
    return String(first[sortBy] || "").localeCompare(
      String(second[sortBy] || ""),
      "ar"
    );
  });

  empty.classList.toggle("hidden", state.people.length > 0 || query.length > 0);
  if (noResults) {
    noResults.classList.toggle("hidden", state.people.length === 0 || people.length > 0);
  }

  await renderFamilyTree();

  for (const person of people) {
    const card = document.createElement("article");
    card.className = "person-card";

    const img = document.createElement("img");
    img.alt = `صورة ${person.name}`;
    img.loading = "lazy";

    try {
      const url = await photoUrl(person.id);
      if (url) {
        img.src = url;
        img.dataset.objectUrl = url;
      } else {
        img.alt = "الصورة غير متاحة؛ يمكنك تعديل بيانات الشخص أو صورته";
      }
    } catch {
      img.alt = "تعذر تحميل الصورة";
    }

    const title = document.createElement("h3");
    title.textContent = person.name;

    const relation = document.createElement("p");
    relation.textContent = person.relation;

    const note = document.createElement("p");
    note.textContent = person.note || "لا توجد حكاية مضافة بعد.";

    const interests = [
      person.favoriteFood && `الأكلة المفضلة: ${person.favoriteFood}`,
      person.favoriteSong && `الأغنية المفضلة: ${person.favoriteSong}`,
      person.importantPlace && `مكان مميز: ${person.importantPlace}`
    ].filter(Boolean);
    const interestsText = document.createElement("p");
    interestsText.className = "story-meta";
    interestsText.textContent = interests.join(" · ");

    let audioPlayer = null;
    if (person.hasAudio) {
      try {
        const recording = await getAudio(person.id);
        if (recording) {
          audioPlayer = document.createElement("audio");
          audioPlayer.controls = true;
          audioPlayer.preload = "none";
          audioPlayer.setAttribute("aria-label", `تسجيل صوت ${person.name}`);
          const url = URL.createObjectURL(recording);
          audioPlayer.src = url;
          audioPlayer.dataset.objectUrl = url;
        }
      } catch (error) {
        console.error(`Could not load voice recording for ${person.name}:`, error);
      }
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const details = document.createElement("p");
    const metadata = [];
    if (Number.isFinite(person.age)) metadata.push(`العمر: ${person.age}`);
    if (person.birthday) metadata.push(`عيد الميلاد: ${formatBirthday(person.birthday)}`);
    details.textContent = metadata.join(" • ");

    const editButton = document.createElement("button");
    editButton.className = "secondary";
    editButton.textContent = "تعديل البيانات";
    editButton.addEventListener("click", () => openPersonEditor(person.id));
    const deleteButton = document.createElement("button");
    deleteButton.className = "danger";
    deleteButton.textContent = "حذف";
    deleteButton.addEventListener("click", () => removePerson(person.id));

    actions.append(editButton, deleteButton);
    card.append(img, title, relation, details, note);
    if (interests.length) card.append(interestsText);
    if (audioPlayer) card.append(audioPlayer);
    card.append(actions);
    list.append(card);
  }
}

async function renderFamilyTree() {
  const tree = $("#familyTree");
  if (!tree) return;
  revokeImageUrls(tree);
  tree.replaceChildren();
  if (!state.people.length) return;

  const childrenByParent = new Map();
  state.people.forEach((person) => {
    const parentId = state.people.some((member) => member.id === person.parentId)
      ? person.parentId
      : "";
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(person);
  });

  const rendered = new Set();
  async function createBranch(person, ancestors = new Set()) {
    const item = document.createElement("li");
    item.className = "family-tree-branch";
    const card = document.createElement("article");
    card.className = "family-tree-person";
    const title = document.createElement("strong");
    title.textContent = person.name;
    const relation = document.createElement("span");
    relation.textContent = person.relation;

    try {
      const url = await photoUrl(person.id);
      if (url) {
        const image = document.createElement("img");
        image.src = url;
        image.alt = `صورة ${person.name}`;
        image.loading = "lazy";
        image.dataset.objectUrl = url;
        card.append(image);
      }
    } catch (error) {
      console.error(`Could not load family tree photo for ${person.name}:`, error);
    }
    card.append(title, relation);
    item.append(card);
    rendered.add(person.id);

    const path = new Set(ancestors);
    path.add(person.id);
    const children = (childrenByParent.get(person.id) || [])
      .filter((child) => !path.has(child.id));
    if (children.length) {
      const list = document.createElement("ul");
      list.className = "family-tree-children";
      for (const child of children) {
        list.append(await createBranch(child, path));
      }
      item.append(list);
    }
    return item;
  }

  const roots = childrenByParent.get("") || [];
  const forest = document.createElement("ul");
  forest.className = "family-tree-roots";
  for (const root of roots) forest.append(await createBranch(root));
  for (const person of state.people) {
    if (!rendered.has(person.id)) forest.append(await createBranch(person));
  }
  tree.append(forest);
}

$("#familySearch")?.addEventListener("input", renderFamily);
$("#familySort")?.addEventListener("change", renderFamily);

function showFamilyView(view) {
  const treeVisible = view === "tree";
  $("#familyTree")?.classList.toggle("hidden", !treeVisible);
  $("#familyList")?.classList.toggle("hidden", treeVisible);
  $("#familyCardsView")?.classList.toggle("active", !treeVisible);
  $("#familyTreeView")?.classList.toggle("active", treeVisible);
  $("#familyCardsView")?.setAttribute("aria-pressed", String(!treeVisible));
  $("#familyTreeView")?.setAttribute("aria-pressed", String(treeVisible));
  $("#familyEmpty")?.classList.toggle("hidden", state.people.length > 0);
}

$("#familyCardsView")?.addEventListener("click", () => showFamilyView("cards"));
$("#familyTreeView")?.addEventListener("click", () => showFamilyView("tree"));
document.querySelector("[data-go-family-tree]")?.addEventListener("click", async () => {
  await showPage("family");
  showFamilyView("tree");
});

async function removePerson(id) {
  const person = state.people.find((item) => item.id === id);
  if (!person) return;

  if (!confirm(`متأكدة إنك عايزة تحذفي ${person.name} وصورته وتسجيله الصوتي من التطبيق؟`)) {
    return;
  }

  state.people = state.people
    .filter((item) => item.id !== id)
    .map((item) => item.parentId === id ? { ...item, parentId: "" } : item);
  savePeople();
  await deletePhoto(id);
  await deleteAudio(id);
  await renderFamily();
  await renderStories();
  updateHome();
}

/* Family stories */

const storyForm = $("#storyForm");
const storyAudioInput = $("#storyAudio");
const storyAudioStatus = $("#storyAudioStatus");
const storyAudioSupported = Boolean(
  navigator.mediaDevices?.getUserMedia && window.MediaRecorder
);

function stopStoryRecording() {
  if (state.storyRecordingTimeout) {
    clearTimeout(state.storyRecordingTimeout);
    state.storyRecordingTimeout = null;
  }
  if (state.storyRecorder?.state === "recording") {
    state.storyRecorder.stop();
  }
  state.storyRecordingStream?.getTracks().forEach((track) => track.stop());
  state.storyRecordingStream = null;
  $("#stopStoryRecording").disabled = true;
  $("#startStoryRecording").disabled = !storyAudioSupported;
}

$("#startStoryRecording")?.addEventListener("click", async () => {
  if (!storyAudioSupported) {
    storyAudioStatus.textContent = "التسجيل غير مدعوم؛ اختاروا ملفًا صوتيًا بدلًا منه.";
    return;
  }

  $("#startStoryRecording").disabled = true;
  storyAudioStatus.textContent = "اسمحوا باستخدام الميكروفون لبدء التسجيل.";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.storyRecordingStream = stream;
    state.storyRecordingChunks = [];
    const preferredType = "audio/webm;codecs=opus";
    const options = typeof MediaRecorder.isTypeSupported === "function" &&
      MediaRecorder.isTypeSupported(preferredType)
      ? { mimeType: preferredType }
      : undefined;
    const recorder = new MediaRecorder(stream, options);
    state.storyRecorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) state.storyRecordingChunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      if (state.storyRecordingTimeout) {
        clearTimeout(state.storyRecordingTimeout);
        state.storyRecordingTimeout = null;
      }
      const recording = new Blob(state.storyRecordingChunks, {
        type: recorder.mimeType || "audio/webm"
      });
      state.storyRecordingChunks = [];
      state.pendingStoryAudio = recording.size && recording.size <= MAX_AUDIO_SIZE
        ? recording
        : null;
      storyAudioStatus.textContent = !recording.size
        ? "التسجيل فارغ. حاولوا مرة أخرى."
        : recording.size > MAX_AUDIO_SIZE
          ? "التسجيل أكبر من 12 ميجابايت. سجّلوا مقطعًا أقصر."
          : "تم تجهيز التسجيل. احفظوا الحكاية لتخزينه.";
      state.storyRecordingStream?.getTracks().forEach((track) => track.stop());
      state.storyRecordingStream = null;
      state.storyRecorder = null;
      $("#stopStoryRecording").disabled = true;
      $("#startStoryRecording").disabled = false;
    });
    recorder.start();
    $("#stopStoryRecording").disabled = false;
    storyAudioStatus.textContent = "جاري تسجيل الحكاية… الحد الأقصى 30 ثانية.";
    state.storyRecordingTimeout = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_RECORDING_MS);
  } catch (error) {
    console.error("Could not start story recording:", error);
    state.storyRecordingStream?.getTracks().forEach((track) => track.stop());
    state.storyRecordingStream = null;
    $("#startStoryRecording").disabled = false;
    storyAudioStatus.textContent =
      "تعذر الوصول للميكروفون. راجعوا إذن المتصفح أو ارفعوا ملفًا صوتيًا.";
  }
});

$("#stopStoryRecording")?.addEventListener("click", stopStoryRecording);
storyAudioInput?.addEventListener("change", () => {
  const file = storyAudioInput.files[0];
  state.pendingStoryAudio = file || null;
  storyAudioStatus.textContent = file
    ? `التسجيل المختار: ${file.name}. احفظوا الحكاية لتخزينه.`
    : "ارفعوا ملفًا صوتيًا أو سجّلوا ذكرى قصيرة حتى 30 ثانية.";
});

storyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.people.length) {
    alert("أضيفوا فردًا واحدًا على الأقل قبل ربط حكاية به.");
    showPage("family");
    return;
  }

  const audioFile = storyAudioInput.files[0];
  const audio = audioFile || state.pendingStoryAudio;
  if (audio && (!audio.type.startsWith("audio/") || audio.size > MAX_AUDIO_SIZE)) {
    alert("اختاروا ملفًا صوتيًا صالحًا لا يتجاوز 12 ميجابايت.");
    return;
  }

  const story = {
    id: makeId(),
    title: $("#storyTitle").value.trim(),
    personId: $("#storyPerson").value,
    date: $("#storyDate").value,
    text: $("#storyText").value.trim(),
    hasAudio: Boolean(audio),
    createdAt: new Date().toISOString()
  };
  if (!story.title || !story.text || !state.people.some((person) => person.id === story.personId)) {
    alert("اكتبوا عنوان الحكاية ونصها واختاروا فردًا من العيلة.");
    return;
  }

  try {
    if (audio) await saveStoryAudio(story.id, audio);
    state.stories.unshift(story);
    try {
      saveStories();
    } catch (error) {
      state.stories = state.stories.filter((item) => item.id !== story.id);
      if (audio) await deleteStoryAudio(story.id);
      throw error;
    }
    storyForm.reset();
    state.pendingStoryAudio = null;
    storyAudioStatus.textContent =
      "ارفعوا ملفًا صوتيًا أو سجّلوا ذكرى قصيرة حتى 30 ثانية. التسجيل محفوظ على هذا الجهاز.";
    await renderStories();
    updateHome();
  } catch (error) {
    console.error("Could not save family story:", error);
    alert("تعذر حفظ الحكاية. تأكدوا من مساحة التخزين وحاولوا مرة أخرى.");
  }
});

async function renderStories() {
  const timeline = $("#storyTimeline");
  const empty = $("#storiesEmpty");
  const select = $("#storyPerson");
  if (!timeline || !select) return;

  const selectedPerson = select.value;
  select.replaceChildren();
  state.people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = `${person.name} — ${person.relation}`;
    select.append(option);
  });
  if (state.people.some((person) => person.id === selectedPerson)) {
    select.value = selectedPerson;
  }
  select.disabled = !state.people.length;
  const submitButton = storyForm?.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = !state.people.length;

  revokeImageUrls(timeline);
  timeline.replaceChildren();
  const stories = [...state.stories].sort((first, second) =>
    String(second.date || second.createdAt).localeCompare(
      String(first.date || first.createdAt)
    )
  );
  empty.classList.toggle("hidden", stories.length > 0);

  for (const story of stories) {
    const person = state.people.find((item) => item.id === story.personId);
    const card = document.createElement("article");
    card.className = "story-card";
    card.id = `story-${story.id}`;

    const title = document.createElement("h3");
    title.textContent = story.title;
    const metadata = document.createElement("p");
    metadata.className = "story-meta";
    const storyDate = story.date
      ? new Date(`${story.date}T12:00:00`).toLocaleDateString(getLocaleTag(), {
          year: "numeric",
          month: "long",
          day: "numeric"
        })
      : new Date(story.createdAt).toLocaleDateString(getLocaleTag());
    metadata.textContent = `${person ? `${person.name} · ${person.relation}` : "فرد غير موجود في الألبوم"} · ${storyDate}`;
    const content = document.createElement("p");
    content.className = "story-content";
    content.textContent = story.text;
    card.append(title, metadata, content);

    if (person) {
      try {
        const url = await photoUrl(person.id);
        if (url) {
          const image = document.createElement("img");
          image.className = "story-photo";
          image.src = url;
          image.alt = `صورة ${person.name} المرتبطة بالحكاية`;
          image.loading = "lazy";
          image.dataset.objectUrl = url;
          card.insertBefore(image, content);
        }
      } catch (error) {
        console.error(`Could not load story photo for ${person.name}:`, error);
      }
    }

    if (story.hasAudio) {
      try {
        const recording = await getStoryAudio(story.id);
        if (recording) {
          const player = document.createElement("audio");
          player.controls = true;
          player.preload = "none";
          player.setAttribute("aria-label", `التسجيل الصوتي للحكاية: ${story.title}`);
          const url = URL.createObjectURL(recording);
          player.src = url;
          player.dataset.objectUrl = url;
          card.append(player);
        }
      } catch (error) {
        console.error(`Could not load story recording ${story.id}:`, error);
      }
    }

    const actions = document.createElement("div");
    actions.className = "actions";
    const readButton = document.createElement("button");
    readButton.type = "button";
    readButton.className = "secondary";
    readButton.textContent = "🔊 اقرأ الحكاية";
    readButton.addEventListener("click", () => {
      if (!speakArabic(`${story.title}. ${story.text}`)) {
        alert("تشغيل القراءة الصوتية غير مدعوم في هذا المتصفح.");
      }
    });
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "حذف الحكاية";
    deleteButton.addEventListener("click", async () => {
      if (!confirm(`هل تريدون حذف حكاية «${story.title}»؟`)) return;
      const previousStories = state.stories;
      state.stories = state.stories.filter((item) => item.id !== story.id);
      try {
        saveStories();
        if (story.hasAudio) await deleteStoryAudio(story.id);
        await renderStories();
        updateHome();
      } catch (error) {
        state.stories = previousStories;
        try {
          saveStories();
        } catch (rollbackError) {
          console.error("Could not restore story metadata after delete failure:", rollbackError);
        }
        console.error("Could not delete family story:", error);
        alert("تعذر حذف الحكاية من التخزين المحلي.");
      }
    });
    actions.append(readButton, deleteButton);
    card.append(actions);
    timeline.append(card);
  }
  populateReminderMemories();
}

$("#weeklyChallengeButton")?.addEventListener("click", async () => {
  const story = getWeeklyStory();
  await showPage("stories");
  if (story) {
    document.getElementById(`story-${story.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  } else {
    $("#storyTitle")?.focus();
  }
});

function getWeeklyStory() {
  if (!state.stories.length) return null;
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return [...state.stories].sort((first, second) =>
    first.id.localeCompare(second.id)
  )[week % state.stories.length];
}

function renderWeeklyChallenge() {
  const prompt = $("#weeklyChallengeText");
  const button = $("#weeklyChallengeButton");
  if (!prompt || !button) return;
  const story = getWeeklyStory();
  prompt.textContent = story
    ? `لو الوقت مناسب، افتحوا «${story.title}» واستمتعوا بذكرى العيلة سوا.`
    : "أضيفوا حكاية عائلية، وارجعوا لها معًا وقت ما تحبوا.";
  button.textContent = story ? "افتحوا الذكرى" : "أضيفوا أول حكاية";
}

/* Home summary */

function birthdayDaysAway(birthday) {
  if (!birthday || !isValidBirthday(birthday)) return Infinity;

  const [, month, day] = birthdayParts(birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let year = today.getFullYear(); ; year++) {
    const occurrence = new Date(year, month - 1, day);
    if (occurrence.getMonth() === month - 1) {
      occurrence.setHours(0, 0, 0, 0);
      if (occurrence >= today) {
        return Math.round((occurrence - today) / 86400000);
      }
    }
  }

  return Infinity;
}

function formatBirthday(birthday) {
  if (!isValidBirthday(birthday)) return "";
  const [, month, day] = birthdayParts(birthday);
  return new Date(2000, month - 1, day).toLocaleDateString(getLocaleTag(), {
    day: "numeric",
    month: "long"
  });
}

function birthdayParts(birthday) {
  const parts = birthday.split("-").map(Number);
  return parts.length === 3 ? parts : [null, parts[0], parts[1]];
}

function birthdayInputValue(birthday) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return birthday;
  const [month, day] = birthday.split("-");
  return `${new Date().getFullYear()}-${month}-${day}`;
}

function isValidBirthday(birthday) {
  if (!birthday) return true;
  if (!/^(?:\d{2}-\d{2}|\d{4}-\d{2}-\d{2})$/.test(birthday)) return false;

  const parts = birthdayParts(birthday);
  if (parts.length !== 3) return false;
  const [year, month, day] = parts;

  if (!month || !day || month > 12 || day > 31) return false;
  if (year === null) {
    const date = new Date(2000, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
    year < 1 ||
    year > 9999
  ) {
    return false;
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function renderUpcomingBirthdays() {
  const list = $("#upcomingBirthdays");
  if (!list) return;

  list.replaceChildren();
  const upcoming = state.people
    .filter((person) => Number.isFinite(birthdayDaysAway(person.birthday)))
    .sort((first, second) =>
      birthdayDaysAway(first.birthday) - birthdayDaysAway(second.birthday)
    )
    .slice(0, 5);

  if (!upcoming.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "أضفوا يوم وشهر الميلاد لشخص عشان يظهر هنا.";
    list.append(empty);
    return;
  }

  upcoming.forEach((person) => {
    const row = document.createElement("div");
    row.className = "upcoming-row";

    const name = document.createElement("strong");
    name.textContent = person.name;

    const date = document.createElement("span");
    const days = birthdayDaysAway(person.birthday);
    date.textContent = days === 0
      ? `النهارده · ${formatBirthday(person.birthday)}`
      : days === 1
        ? `بكرة · ${formatBirthday(person.birthday)}`
        : `بعد ${days} يوم · ${formatBirthday(person.birthday)}`;

    row.append(name, date);
    list.append(row);
  });
}

function updateHome() {
  const count = $("#familyCount");
  if (count) count.textContent = state.people.length;

  const sessionsCount = $("#homeSessionCount");
  if (sessionsCount) sessionsCount.textContent = state.sessions.length;
  renderUpcomingBirthdays();
  renderWeeklyChallenge();
}

/* Local Web Push reminders */

async function reminderApi(endpoint, options = {}) {
  const response = await fetch(`${REMINDER_API}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "تعذر الاتصال بالخادم المحلي.");
  }
  return result;
}

function setReminderStatus(message, isError = false) {
  const status = $("#reminderStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function populateReminderMemories() {
  const select = $("#reminderMemory");
  if (!select) return;
  const selectedId = select.value || state.reminderMemoryId;
  select.replaceChildren();
  state.stories.forEach((story) => {
    const option = document.createElement("option");
    option.value = story.id;
    option.textContent = story.title;
    select.append(option);
  });
  if (state.stories.some((story) => story.id === selectedId)) {
    select.value = selectedId;
  } else if (state.stories.length) {
    select.value = state.stories[0].id;
  }
  select.disabled = !state.stories.length;
  updateReminderSaveAvailability();
  renderReminderMemoryPreview();
}

function updateReminderSaveAvailability() {
  const needsMemory = $("#reminderMessage")?.value === "memory";
  $("#reminderSaveBtn").disabled =
    Boolean($("#reminderEnabled")?.checked && needsMemory && !state.stories.length);
}

async function renderReminderMemoryPreview() {
  const preview = $("#reminderMemoryPreview");
  if (!preview) return;
  const token = ++state.reminderPreviewToken;
  revokeImageUrls(preview);
  preview.replaceChildren();
  const story = state.stories.find((item) => item.id === $("#reminderMemory")?.value);
  if (!story) {
    const message = document.createElement("p");
    message.className = "help";
    message.textContent = "أضيفوا حكاية وصورة من قسم حكايات العيلة لاستخدامها في التذكير.";
    preview.append(message);
    return;
  }
  const person = state.people.find((item) => item.id === story.personId);
  const title = document.createElement("strong");
  title.textContent = story.title;
  preview.append(title);
  if (person) {
    try {
      const photo = await getPhoto(person.id);
      if (photo) {
        if (token !== state.reminderPreviewToken) return;
        const image = document.createElement("img");
        const url = URL.createObjectURL(photo);
        image.src = url;
        image.alt = `صورة مرتبطة بذكرى ${story.title}`;
        image.dataset.objectUrl = url;
        preview.append(image);
      }
    } catch (error) {
      console.error("Could not load reminder memory photo:", error);
    }
  }
  if (story.hasAudio || person?.hasAudio) {
    try {
      const audio = await getMemoryAudio(story, person);
      if (audio) {
        if (token !== state.reminderPreviewToken) return;
        const player = document.createElement("audio");
        player.controls = true;
        player.preload = "none";
        player.setAttribute("aria-label", `صوت الذكرى ${story.title}`);
        const url = URL.createObjectURL(audio);
        player.src = url;
        player.dataset.objectUrl = url;
        preview.append(player);
      }
    } catch (error) {
      console.error("Could not load reminder memory audio:", error);
    }
  } else {
    const text = document.createElement("p");
    text.className = "help";
    text.textContent = "الحكاية مرتبطة بصورة. يمكنكم إضافة تسجيل للحكاية أو للشخص.";
    preview.append(text);
  }
}

$("#reminderMemory")?.addEventListener("change", renderReminderMemoryPreview);
$("#reminderMessage")?.addEventListener("change", () => {
  const useMemory = $("#reminderMessage").value === "memory";
  $("#reminderMemoryField").classList.toggle("hidden", !useMemory);
  populateReminderMemories();
});
$("#reminderEnabled")?.addEventListener("change", updateReminderSaveAvailability);

function reminderDays() {
  return [...document.querySelectorAll(".reminder-day-list input:checked")]
    .map((input) => Number(input.value));
}

function applyReminderSettings(reminder) {
  $("#reminderEnabled").checked = reminder.enabled;
  $("#reminderTime").value = reminder.time;
  $("#reminderMessage").value = reminder.message;
  $("#reminderAdaptive").checked = reminder.adaptive;
  document.querySelectorAll(".reminder-day-list input").forEach((input) => {
    input.checked = reminder.days.includes(Number(input.value));
  });
  $("#reminderMemoryField").classList.toggle("hidden", reminder.message !== "memory");
  populateReminderMemories();
}

async function requestReminderPermission() {
  if (!("Notification" in window)) {
    throw new Error("الإشعارات غير مدعومة في هذا المتصفح.");
  }
  if (Notification.permission === "denied") {
    throw new Error(
      "Edge حاظر إشعارات الموقع. افتحي edge://settings/content/notifications، " +
      "واحذفي 127.0.0.1 من قائمة الحظر، ثم أعيدي تحميل الموقع."
    );
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("لم يتم السماح بالإشعارات من المتصفح.");
  }
  setReminderStatus("تم السماح بالإشعارات على هذا الجهاز.");
}

function decodeVapidKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function registerReminderDevice() {
  if (location.protocol !== "http:" || location.hostname !== "127.0.0.1") {
    throw new Error("افتحي الموقع من http://127.0.0.1:3000 بعد تشغيل الخادم المحلي.");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("متصفحك لا يدعم إشعارات الويب.");
  }
  if (!("Notification" in window)) {
    throw new Error("الإشعارات غير مدعومة في هذا المتصفح.");
  }
  if (Notification.permission !== "granted") {
    await requestReminderPermission();
  }

  const registration = await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  const { vapidPublicKey } = await reminderApi("/config");
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(vapidPublicKey)
    });
  }

  await reminderApi("/devices", {
    method: "POST",
    body: JSON.stringify({ subscription: subscription.toJSON() })
  });
  setReminderStatus("تم ربط هذا المتصفح بإشعارات ذاكرتي.");
}

async function saveReminderSettings() {
  const days = reminderDays();
  if ($("#reminderEnabled").checked && !days.length) {
    throw new Error("اختاري يومًا واحدًا على الأقل.");
  }
  if (
    $("#reminderEnabled").checked &&
    $("#reminderMessage").value === "memory" &&
    !$("#reminderMemory").value
  ) {
    throw new Error("اختاروا حكاية واحدة على الأقل لربطها بالتذكير.");
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if ($("#reminderEnabled").checked && !subscription) {
    throw new Error("اسمحي بالإشعارات وارْبطي هذا الجهاز أولًا.");
  }
  if (subscription && $("#reminderEnabled").checked) {
    await reminderApi("/devices", {
      method: "POST",
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
  }

  await reminderApi("/reminders", {
    method: "PUT",
    body: JSON.stringify({
      enabled: $("#reminderEnabled").checked,
      time: $("#reminderTime").value,
      days: days.length ? days : [new Date().getDay()],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      message: $("#reminderMessage").value,
      adaptive: $("#reminderAdaptive").checked
    })
  });

  state.reminderMemoryId = $("#reminderMemory").value || "";
  if ($("#reminderMessage").value !== "memory") state.reminderMemoryId = "";
  try {
    localStorage.setItem(REMINDER_MEMORY_KEY, JSON.stringify(state.reminderMemoryId));
  } catch (error) {
    console.error("Could not save local reminder memory:", error);
    throw new Error("تم حفظ جدول التذكير، لكن تعذر حفظ الذكرى على هذا الجهاز.");
  }
  setReminderStatus(
    $("#reminderEnabled").checked
      ? "تم حفظ الجدول. لازم يفضل الخادم المحلي شغال لإرسال التذكير."
      : "تم حفظ الإعدادات والتذكيرات متوقفة."
  );
}

async function sendTestReminder() {
  await reminderApi("/reminders/test", { method: "POST" });
  setReminderStatus("تم قبول الإشعار التجريبي للإرسال. راجعي إعدادات إشعارات المتصفح.");
}

async function stopReminders() {
  await reminderApi("/reminders/stop", { method: "POST" });
  $("#reminderEnabled").checked = false;
  setReminderStatus("تم إيقاف جدول التذكير.");
}

async function disconnectReminderDevice() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    setReminderStatus("هذا الجهاز غير مربوط بالإشعارات.");
    return;
  }

  await reminderApi("/devices", {
    method: "DELETE",
    body: JSON.stringify({ endpoint: subscription.endpoint })
  });
  await subscription.unsubscribe();
  setReminderStatus("تم فصل هذا الجهاز عن الإشعارات.");
}

function bindReminderAction(buttonId, action) {
  $(`#${buttonId}`)?.addEventListener("click", async () => {
    try {
      await action();
    } catch (error) {
      console.error("Reminder action failed:", error);
      setReminderStatus(error.message, true);
    }
  });
}

bindReminderAction("reminderPermissionBtn", requestReminderPermission);
bindReminderAction("reminderSubscribeBtn", registerReminderDevice);
bindReminderAction("reminderSaveBtn", saveReminderSettings);
bindReminderAction("reminderTestBtn", sendTestReminder);
bindReminderAction("reminderStopBtn", stopReminders);
bindReminderAction("reminderUnsubscribeBtn", disconnectReminderDevice);

async function loadReminderSettings() {
  populateReminderMemories();
  if (location.protocol === "file:") {
    setReminderStatus(
      "لتجربة التذكيرات، شغّلي الخادم المحلي وافتحي التطبيق من http://127.0.0.1:3000."
    );
    return;
  }

  try {
    const { reminder } = await reminderApi("/reminders");
    if (reminder) {
      applyReminderSettings(reminder);
      setReminderStatus(
        reminder.enabled
          ? "تم تحميل جدول التذكير المحفوظ."
          : "التذكيرات متوقفة حاليًا."
      );
    } else {
      setReminderStatus("اختاري الوقت والأيام ثم احفظي جدول التذكير.");
    }
  } catch (error) {
    setReminderStatus(
      "شغّلي الخادم المحلي أولًا: npm start، ثم افتحي http://127.0.0.1:3000.",
      true
    );
  }
}

/* Game utilities */

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function speakArabic(text, options = {}) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return false;
  }

  try {
    const settings = getAccessibilitySettings();
    const localizedText = translatedPhrase(text, settings.language);
    const repeatCount = [1, 2, 3].includes(Number(settings.instructionRepeats))
      ? Number(settings.instructionRepeats)
      : 1;
    const audioText = options.instruction === true
      ? Array(repeatCount).fill(localizedText).join(". ")
      : localizedText;
    const containsArabic = /\p{Script=Arabic}/u.test(audioText);
    const languageCode = containsArabic
      ? "ar"
      : settings.language === "fr" ? "fr" : settings.language === "en" ? "en" : "ar";
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.lang = languageCode === "ar"
      ? "ar-EG"
      : languageCode === "fr" ? "fr-FR" : "en-US";
    utterance.rate = Math.min(1.4, Math.max(0.6, Number(settings.speechRate) || 0.9));
    utterance.pitch = 1;
    const voice = window.speechSynthesis.getVoices()
      .find((candidate) => candidate.lang.toLocaleLowerCase().startsWith(languageCode));
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.error("Speech playback failed:", error);
    return false;
  }
}

function speechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function startArabicSpeechInput(onText, statusElement, button) {
  const SpeechRecognition = speechRecognitionConstructor();
  if (!SpeechRecognition) {
    statusElement.textContent = "التعرّف على الكلام غير مدعوم هنا. استخدموا الأزرار أو لوحة المفاتيح.";
    return;
  }
  if (state.activeSpeechRecognition) {
    state.activeSpeechRecognition.stop();
  }

  const recognition = new SpeechRecognition();
  state.activeSpeechRecognition = recognition;
  recognition.lang = {
    ar: "ar-EG",
    en: "en-US",
    fr: "fr-FR"
  }[getAccessibilitySettings().language] || "ar-EG";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  button.disabled = true;
  statusElement.textContent = "جاري الاستماع… قولوا الأمر الآن.";
  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript?.trim();
    if (text) onText(text);
    else statusElement.textContent = "لم أسمع كلامًا واضحًا. حاولوا مرة أخرى أو استخدموا الأزرار.";
  };
  recognition.onerror = (event) => {
    const message = event.error === "not-allowed"
      ? "لم يُسمح باستخدام الميكروفون. يمكنكم تفعيل الإذن من إعدادات المتصفح."
      : event.error === "no-speech"
        ? "لم أسمع كلامًا. اضغطوا الزر وحاولوا مرة أخرى."
        : "تعذر التعرّف على الكلام. استخدموا الأزرار المتاحة.";
    statusElement.textContent = message;
  };
  recognition.onend = () => {
    if (state.activeSpeechRecognition === recognition) {
      state.activeSpeechRecognition = null;
    }
    button.disabled = false;
  };
  try {
    recognition.start();
  } catch (error) {
    state.activeSpeechRecognition = null;
    button.disabled = false;
    statusElement.textContent = "تعذر تشغيل الميكروفون. استخدموا الأزرار المتاحة.";
    console.error("Could not start Arabic speech recognition:", error);
  }
}

function normalizeVoiceCommand(value) {
  return value
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[،,.!?؟]/g, "")
    .trim();
}

function voiceCommandIncludes(command, phrases) {
  return phrases.some((phrase) => command.includes(phrase));
}

function handleVoiceCommand(transcript) {
  const command = normalizeVoiceCommand(transcript);
  const status = $("#voiceCommandStatus");
  const language = getAccessibilitySettings().language;
  const heard = {
    ar: `سمعت: «${transcript}»`,
    en: `Heard: “${transcript}”`,
    fr: `J’ai entendu : « ${transcript} »`
  };
  status.textContent = heard[language] || heard.ar;

  const actions = state.activeMemoryActions;
  if (actions) {
    const commands = {
      ar: {
        finish: ["انهاء", "خلاص"],
        next: ["التالي", "ذكره تانيه"],
        hint: ["تلميح", "ساعدني", "معلومه"],
        story: ["اقرا الحكايه", "اسمع الحكايه"],
        familiar: ["كانت مالوفه", "اسبوع"],
        supported: ["احتجنا تلميح", "ثلاثه ايام"],
        reviewSoon: ["قريب", "بكره", "يوم"]
      },
      en: {
        finish: ["finish", "end"],
        next: ["next", "another memory"],
        hint: ["hint", "help"],
        story: ["read the story", "listen to the story"],
        familiar: ["familiar", "one week"],
        supported: ["needed a hint", "three days"],
        reviewSoon: ["soon", "tomorrow", "one day"]
      },
      fr: {
        finish: ["terminer", "finir"],
        next: ["suivant", "autre souvenir"],
        hint: ["indice", "aidez-moi"],
        story: ["lire le récit", "écouter le récit"],
        familiar: ["familier", "une semaine"],
        supported: ["besoin d'un indice", "trois jours"],
        reviewSoon: ["bientôt", "demain", "un jour"]
      }
    }[language] || {
      finish: ["انهاء", "خلاص"],
      next: ["التالي", "ذكره تانيه"],
      hint: ["تلميح", "ساعدني", "معلومه"],
      story: ["اقرا الحكايه", "اسمع الحكايه"],
      familiar: ["كانت مالوفه", "اسبوع"],
      supported: ["احتجنا تلميح", "ثلاثه ايام"],
      reviewSoon: ["قريب", "بكره", "يوم"]
    };
    if (voiceCommandIncludes(command, commands.finish)) actions.finish();
    else if (voiceCommandIncludes(command, commands.next)) actions.next();
    else if (voiceCommandIncludes(command, commands.hint)) actions.hint();
    else if (voiceCommandIncludes(command, commands.story)) actions.story();
    else if (voiceCommandIncludes(command, commands.familiar)) actions.familiar?.();
    else if (voiceCommandIncludes(command, commands.supported)) actions.supported?.();
    else if (voiceCommandIncludes(command, commands.reviewSoon)) actions.reviewSoon?.();
    else status.textContent += language === "en"
      ? " — Try: hint, read the story, next, or finish."
      : language === "fr"
        ? " — Dites : indice, lire le récit, suivant ou terminer."
        : " — جرّبوا: تلميح، اقرأ الحكاية، التالي، أو إنهاء.";
    return;
  }

  const navigationCommands = {
    ar: {
      recall: ["ابدا المراجعه", "سمارت ريكول"],
      memories: ["ابدا جلسه", "جلسه الذكريات"],
      tree: ["شجره العيله"],
      family: ["افتح العيله", "افراد العيله"],
      stories: ["الحكايات", "افتح الحكايه", "الحكايه"],
      games: ["الانشطه", "الالعاب"],
      settings: ["الاعدادات", "الخصوصيه"],
      home: ["الصفحه الرئيسيه", "الرئيسيه"]
    },
    en: {
      recall: ["start recall", "smart recall"],
      memories: ["start a session", "memory session"],
      tree: ["family tree"],
      family: ["open family", "family members"],
      stories: ["stories", "open stories"],
      games: ["activities", "games"],
      settings: ["settings", "privacy"],
      home: ["home", "main page"]
    },
    fr: {
      recall: ["commencer le rappel", "smart recall"],
      memories: ["commencer une séance", "séance de souvenirs"],
      tree: ["arbre généalogique"],
      family: ["ouvrir la famille", "membres de la famille"],
      stories: ["récits", "ouvrir les récits"],
      games: ["activités", "jeux"],
      settings: ["réglages", "confidentialité"],
      home: ["accueil", "page d'accueil"]
    }
  }[language] || {};
  const navigation = (name) =>
    voiceCommandIncludes(command, navigationCommands[name] || []);

  if (navigation("recall")) {
    showPage("games");
    startSmartRecall();
  } else if (navigation("memories")) {
    showPage("games");
    startMemoryJourney();
  } else if (navigation("tree")) {
    showPage("family");
    showFamilyView("tree");
  } else if (navigation("family")) {
    showPage("family");
  } else if (navigation("stories")) {
    showPage("stories");
  } else if (navigation("games")) {
    showPage("games");
  } else if (navigation("settings")) {
    showPage("settings");
  } else if (navigation("home")) {
    showPage("home");
  } else {
    status.textContent += language === "en"
      ? " — Try: home, family, stories, activities, start recall, or start a memory session."
      : language === "fr"
        ? " — Dites : accueil, famille, récits, activités, commencer le rappel ou commencer une séance."
        : " — جرّبوا: الرئيسية، العيلة، الحكايات، الأنشطة، ابدأ المراجعة، أو ابدأ جلسة الذكريات.";
  }
}

const voiceCommandButton = $("#voiceCommandButton");
const voiceCommandStatus = $("#voiceCommandStatus");
voiceCommandButton?.addEventListener("click", () => {
  startArabicSpeechInput(handleVoiceCommand, voiceCommandStatus, voiceCommandButton);
});

const storyDictateButton = $("#storyDictateButton");
const storyDictateStatus = $("#storyDictateStatus");
storyDictateButton?.addEventListener("click", () => {
  startArabicSpeechInput((transcript) => {
    const textArea = $("#storyText");
    textArea.value = `${textArea.value.trim()}${textArea.value.trim() ? " " : ""}${transcript}`;
    storyDictateStatus.textContent = "أُضيف الكلام إلى نص الحكاية. راجعوه قبل الحفظ.";
  }, storyDictateStatus, storyDictateButton);
});

function addQuestionAudio(panel, text) {
  const controls = document.createElement("div");
  controls.className = "audio-controls";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = "🔊 اسمع السؤال";
  button.addEventListener("click", () => {
    if (!speakArabic(text, { instruction: true })) {
      alert("تشغيل الصوت غير مدعوم في هذا المتصفح.");
    }
  });
  controls.append(button);
  panel.append(controls);

  if (state.game?.autoReadQuestions) {
    speakArabic(text, { instruction: true });
  }
}

function beginGame(gameType) {
  if (gameType === "smart-recall") {
    startSmartRecall();
    $("#gameArea")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (gameType === "memories") {
    startMemoryJourney();
    $("#gameArea")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (state.people.length < 2) {
    alert("ضيفي صورتين على الأقل من أفراد العيلة الأول.");
    showPage("family");
    return;
  }

  const participantCode = ($("#participantCode")?.value || "").trim();

  if (!participantCode) {
    alert("اكتبي كودًا مستعارًا للمشارك في قسم البحث، من غير اسمه الحقيقي.");
    showPage("research");
    $("#participantCode")?.focus();
    return;
  }

  if (gameType === "clue" && !state.people.some((person) => personClue(person))) {
    alert("أضيفوا حكاية أو معلومة أو اهتمامًا مميزًا لشخص واحد على الأقل من قسم العيلة.");
    showPage("family");
    return;
  }

  if (gameType === "voice" && state.people.filter((person) => person.hasAudio).length < 2) {
    alert("ضيفي تسجيلين صوتيين على الأقل من قسم أفراد العيلة الأول.");
    showPage("family");
    return;
  }

  state.currentGame = gameType;
  state.game = {
    type: gameType,
    autoReadQuestions: state.autoReadQuestions,
    difficulty: $("#gameDifficulty")?.value || "normal",
    choiceCount: ({
      easy: 2,
      normal: 3,
      hard: 4
    })[$("#gameDifficulty")?.value] || 3,
    participantCode,
    startedAt: Date.now(),
    questionStartedAt: Date.now(),
    questions: [],
    index: 0,
    correct: 0,
    answered: 0,
    hints: 0,
    skipped: 0,
    responseTimes: [],
    orderAttempts: 0
  };

  $("#gameArea")?.classList.remove("hidden");

  if (gameType === "who") {
    startWhoGame();
  } else if (gameType === "clue") {
    startClueGame();
  } else if (gameType === "voice") {
    startVoiceGame();
  } else if (gameType === "order") {
    startOrderGame();
  }

  $("#gameArea")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll("[data-game]").forEach((button) => {
  button.addEventListener("click", () => beginGame(button.dataset.game));
});

const autoReadInput = $("#autoReadQuestions");
const voiceSupport = $("#voiceSupport");
const speechAvailable =
  "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

if (autoReadInput) {
  autoReadInput.checked = state.autoReadQuestions;
  autoReadInput.disabled = !speechAvailable;
  autoReadInput.addEventListener("change", () => {
    state.autoReadQuestions = autoReadInput.checked;
    try {
      localStorage.setItem(VOICE_SETTING_KEY, JSON.stringify(state.autoReadQuestions));
    } catch (error) {
      console.error("Could not save voice setting:", error);
      if (voiceSupport) {
        voiceSupport.textContent = "تعذر حفظ الاختيار، لكنه هيشتغل لحد ما تقفل الصفحة.";
      }
    }
  });
}

if (!speechAvailable && voiceSupport) {
  voiceSupport.textContent = "متصفحك لا يدعم القراءة الصوتية. جرّب متصفحًا أحدث.";
}

function gameShell(title, description = "") {
  const area = $("#gameArea");
  revokeImageUrls(area);
  area.replaceChildren();

  const panel = document.createElement("section");
  panel.className = "game-panel";

  const heading = document.createElement("h2");
  heading.textContent = title;

  panel.append(heading);

  if (description) {
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    panel.append(paragraph);
  }

  panel.dir = document.documentElement.dir;
  area.append(panel);
  return panel;
}

function createFeedback(panel) {
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");
  panel.append(feedback);
  return feedback;
}

function addEndButton(panel) {
  const button = document.createElement("button");
  button.className = "secondary";
  button.textContent = "إنهاء الجلسة";
  button.addEventListener("click", () => finishGame(true));
  panel.append(button);
}

function recordAnswer(correct, responseTime) {
  const game = state.game;
  if (!game) return;

  game.answered += 1;
  if (correct) game.correct += 1;
  game.responseTimes.push(responseTime);
  game.questions.push({ correct, responseTime });
}

/* Smart Recall: gentle retrieval cues with caregiver-selected review spacing */

function startSmartRecall(storyId = "") {
  const memories = state.stories.filter((story) =>
    state.people.some((person) => person.id === story.personId)
  );
  if (!memories.length) {
    alert("أضيفوا صورة وحكاية واحدة على الأقل قبل بدء Smart Recall.");
    showPage("stories");
    return;
  }

  const selected = memories.find((story) => story.id === storyId);
  const now = Date.now();
  const due = memories.filter((story) =>
    !story.recall?.nextReviewAt ||
    new Date(story.recall.nextReviewAt).getTime() <= now
  );
  const queue = selected
    ? [selected]
    : (due.length ? due : memories);
  queue.sort((first, second) =>
    String(first.recall?.nextReviewAt || first.createdAt)
      .localeCompare(String(second.recall?.nextReviewAt || second.createdAt))
  );
  state.game = null;
  state.currentGame = null;
  state.memoryJourney = null;
  state.activeMemoryActions = null;
  state.smartRecall = {
    stories: queue,
    index: 0,
    cueLevel: 0,
    isEarlyReview: !selected && due.length === 0
  };
  $("#gameArea")?.classList.remove("hidden");
  showSmartRecallMoment();
}

async function showSmartRecallMoment() {
  const recall = state.smartRecall;
  if (!recall) return;
  if (recall.index >= recall.stories.length) {
    finishSmartRecall();
    return;
  }

  const story = recall.stories[recall.index];
  const person = state.people.find((item) => item.id === story.personId);
  if (!person) {
    recall.index += 1;
    await showSmartRecallMoment();
    return;
  }
  recall.cueLevel = 0;

  const panel = gameShell(
    "Smart Recall · مراجعة هادئة",
    recall.isEarlyReview
      ? "مفيش ذكرى مستحقة للمراجعة اليوم. يمكنكم مراجعة واحدة مبكرًا أو العودة لاحقًا."
      : "ابدأوا بالصورة وخدوا وقتكم. مفيش إجابة غلط؛ المرافق يختار التلميح المناسب."
  );
  const progress = document.createElement("p");
  progress.className = "help";
  progress.textContent = `ذكرى ${recall.index + 1} من ${recall.stories.length}`;
  panel.append(progress);

  const image = document.createElement("img");
  image.className = "game-photo memory-photo";
  image.alt = "صورة عائلية للتذكّر";
  try {
    const url = await photoUrl(person.id);
    if (url) {
      image.src = url;
      image.dataset.objectUrl = url;
      panel.append(image);
    }
  } catch (error) {
    console.error(`Could not load Smart Recall photo for ${person.name}:`, error);
  }

  const prompt = document.createElement("p");
  prompt.className = "memory-invitation";
  prompt.textContent = "هل الصورة دي مألوفة؟ استنوا براحتكم، أو افتحوا تلميحًا.";
  panel.append(prompt);

  const cue = document.createElement("p");
  cue.className = "memory-cue hidden";
  cue.setAttribute("aria-live", "polite");
  panel.append(cue);

  const title = document.createElement("h3");
  title.className = "hidden";
  title.textContent = story.title;
  panel.append(title);

  const storyText = document.createElement("p");
  storyText.className = "story-content hidden";
  storyText.textContent = story.text;
  panel.append(storyText);

  let audioPlayer = null;
  if (story.hasAudio || person.hasAudio) {
    try {
      const recording = await getMemoryAudio(story, person);
      if (recording) {
        audioPlayer = document.createElement("audio");
        audioPlayer.controls = true;
        audioPlayer.preload = "none";
        audioPlayer.classList.add("hidden");
        audioPlayer.setAttribute("aria-label", `التسجيل الصوتي للحكاية ${story.title}`);
        const url = URL.createObjectURL(recording);
        audioPlayer.src = url;
        audioPlayer.dataset.objectUrl = url;
        panel.append(audioPlayer);
      }
    } catch (error) {
      console.error(`Could not load Smart Recall audio ${story.id}:`, error);
    }
  }

  const controls = document.createElement("div");
  controls.className = "actions memory-actions";
  const hintButton = document.createElement("button");
  hintButton.type = "button";
  hintButton.className = "secondary";
  hintButton.textContent = "أظهر تلميحًا";
  hintButton.addEventListener("click", () => {
    recall.cueLevel = Math.min(3, recall.cueLevel + 1);
    cue.classList.remove("hidden");
    if (recall.cueLevel === 1) {
      cue.textContent = `${person.name} · ${person.relation}`;
    } else {
      title.classList.remove("hidden");
      if (recall.cueLevel === 2) {
        cue.textContent = "دي حكاية مرتبطة بـ";
        if (audioPlayer) audioPlayer.classList.remove("hidden");
      } else {
        cue.textContent = "نقدر نقرأ الحكاية معًا.";
        storyText.classList.remove("hidden");
      }
    }
    if (recall.cueLevel >= 3) hintButton.disabled = true;
  });

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "secondary";
  nextButton.textContent = "ذكرى تانية";
  nextButton.addEventListener("click", () => {
    recall.index += 1;
    showSmartRecallMoment();
  });

  const schedule = document.createElement("fieldset");
  schedule.className = "recall-schedule field full";
  const legend = document.createElement("legend");
  legend.textContent = "اختاروا موعد الرجوع للذكرى، حسب اللي كان مريحًا";
  schedule.append(legend);
  const supportOptions = [
    { key: "familiar", label: "كانت مألوفة" },
    { key: "hint", label: "احتجنا تلميحًا" },
    { key: "story", label: "قرأنا أو سمعنا الحكاية" }
  ];
  supportOptions.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    const interval = getSmartRecallInterval(story, option.key);
    button.textContent =
      `${translatedPhrase(option.label)} · ${formatRecallInterval(interval)}`;
    button.addEventListener("click", () => {
      if (!saveSmartRecallSchedule(story.id, option.key)) return;
      recall.index += 1;
      showSmartRecallMoment();
    });
    schedule.append(button);
  });

  const note = document.createElement("small");
  note.className = "help full";
  note.textContent =
    "المواعيد للتنظيم فقط حسب مقدار المساعدة، ومش درجات أو قياسًا طبيًا. اتركوا الذكرى بلا موعد لو تحبوا.";
  const finish = document.createElement("button");
  finish.type = "button";
  finish.className = "primary";
  finish.textContent = "إنهاء المراجعة";
  finish.addEventListener("click", finishSmartRecall);
  controls.append(hintButton, nextButton, finish);
  panel.append(controls, schedule, note);

  state.activeMemoryActions = {
    hint: () => hintButton.click(),
    story: () => {
      recall.cueLevel = 3;
      cue.classList.remove("hidden");
      cue.textContent = "نقدر نقرأ الحكاية معًا.";
      title.classList.remove("hidden");
      storyText.classList.remove("hidden");
      if (audioPlayer) audioPlayer.classList.remove("hidden");
      else speakArabic(`${story.title}. ${story.text}`);
      hintButton.disabled = true;
    },
    next: () => nextButton.click(),
    finish: finishSmartRecall,
    familiar: () => schedule.querySelectorAll("button")[0].click(),
    supported: () => schedule.querySelectorAll("button")[1].click(),
    reviewSoon: () => schedule.querySelectorAll("button")[2].click()
  };
}

function saveSmartRecallSchedule(storyId, support) {
  const story = state.stories.find((item) => item.id === storyId);
  if (!story) return false;
  const intervalDays = getSmartRecallInterval(story, support);
  const nextReviewAt = new Date(Date.now() + intervalDays * 86400000).toISOString();
  const previousStories = state.stories;
  state.stories = state.stories.map((story) => {
    if (story.id !== storyId) return story;
    const reviewCount = (story.recall?.reviewCount || 0) + 1;
    return {
      ...story,
      recall: { intervalDays, nextReviewAt, lastSupport: support, reviewCount }
    };
  });
  try {
    saveStories();
    return true;
  } catch (error) {
    state.stories = previousStories;
    console.error("Could not save Smart Recall schedule:", error);
    alert("تعذر حفظ موعد المراجعة. لم يتغير جدول الذكريات؛ يمكنكم المحاولة مرة أخرى.");
    return false;
  }
}

function getSmartRecallInterval(story, support) {
  const previous = Number(story.recall?.intervalDays) || 0;
  if (support === "familiar") {
    return previous ? Math.min(30, Math.max(7, previous * 2)) : 7;
  }
  if (support === "hint") {
    return previous ? Math.max(1, Math.ceil(previous / 2)) : 3;
  }
  return 1;
}

function formatRecallInterval(days) {
  const language = getAccessibilitySettings().language;
  if (language === "en") return `in ${days} ${days === 1 ? "day" : "days"}`;
  if (language === "fr") return `dans ${days} ${days === 1 ? "jour" : "jours"}`;
  return `بعد ${days === 1 ? "يوم" : `${days} أيام`}`;
}

function finishSmartRecall() {
  state.smartRecall = null;
  state.activeMemoryActions = null;
  const panel = gameShell(
    "انتهت المراجعة ❤️",
    "شكرًا على مشاركة الذكريات. يمكنكم الرجوع لها في أي وقت، من غير درجات أو تقييم."
  );
  const backButton = document.createElement("button");
  backButton.className = "primary";
  backButton.textContent = "العودة للأنشطة";
  backButton.addEventListener("click", () => showPage("games"));
  panel.append(backButton);
}

/* Game: مين بيتكلم؟ */

function startVoiceGame() {
  const game = state.game;
  game.queue = shuffle(state.people.filter((person) => person.hasAudio));
  game.index = 0;
  showVoiceQuestion();
}

async function showVoiceQuestion() {
  const game = state.game;
  if (!game) return;

  if (game.index >= game.queue.length) {
    finishGame(false);
    return;
  }

  const person = game.queue[game.index];
  const panel = gameShell(
    "مين بيتكلم؟",
    `اسمع التسجيل واختار الشخص المناسب. السؤال ${game.index + 1} من ${game.queue.length}.`
  );

  const recording = await getAudio(person.id);
  if (!recording) {
    console.error(`Voice recording is missing for ${person.name}.`);
    alert("التسجيل الصوتي غير متاح. راجعي بيانات أفراد العيلة.");
    finishGame(true);
    return;
  }

  const player = document.createElement("audio");
  player.controls = true;
  player.preload = "auto";
  player.setAttribute("aria-label", "تسجيل صوت الشخص المطلوب");
  const url = URL.createObjectURL(recording);
  player.src = url;
  player.dataset.objectUrl = url;
  panel.append(player);
  game.questionStartedAt = Date.now();

  const choices = shuffle([
    person,
    ...shuffle(game.queue.filter((item) => item.id !== person.id))
      .slice(0, Math.min(game.choiceCount - 1, game.queue.length - 1))
  ]);
  const options = document.createElement("div");
  options.className = "answer-options";
  const feedback = createFeedback(panel);

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice.name;
    button.addEventListener("click", () => {
      if (button.disabled) return;

      const correct = choice.id === person.id;
      recordAnswer(correct, Date.now() - game.questionStartedAt);
      options.querySelectorAll("button").forEach((option) => {
        option.disabled = true;
      });

      feedback.textContent = correct
        ? "عرفت الصوت! إجابة صحيحة ❤️"
        : `ولا يهمك، ده كان صوت ${person.name}.`;
      feedback.className = `feedback ${correct ? "good" : "bad"}`;

      const nextButton = document.createElement("button");
      nextButton.className = "primary";
      nextButton.textContent = "التسجيل التالي";
      nextButton.addEventListener("click", () => {
        game.index += 1;
        game.questionStartedAt = Date.now();
        showVoiceQuestion();
      });
      panel.append(nextButton);
    });
    options.append(button);
  });

  panel.append(options);

  const skipButton = document.createElement("button");
  skipButton.className = "secondary";
  skipButton.textContent = "تخطي التسجيل";
  skipButton.addEventListener("click", () => {
    game.skipped += 1;
    game.index += 1;
    game.questionStartedAt = Date.now();
    showVoiceQuestion();
  });
  panel.append(skipButton);
  addEndButton(panel);
}

/* Game 1: مين ده؟ */

async function startWhoGame() {
  const game = state.game;
  game.queue = shuffle(state.people);
  game.index = 0;
  await showWhoQuestion();
}

async function showWhoQuestion() {
  const game = state.game;
  if (!game) return;

  if (game.index >= game.queue.length) {
    finishGame(false);
    return;
  }

  const person = game.queue[game.index];
  const questionText =
    `مين ده؟ اختار الاسم المناسب للصورة. السؤال ${game.index + 1} من ${game.queue.length}.`;
  const panel = gameShell("مين ده؟", `السؤال ${game.index + 1} من ${game.queue.length}`);
  addQuestionAudio(panel, questionText);

  const img = document.createElement("img");
  img.className = "game-photo";
  img.alt = "صورة الشخص المطلوب التعرف عليه";

  try {
    const url = await photoUrl(person.id);
    if (url) {
      img.src = url;
      img.dataset.objectUrl = url;
    }
  } catch (error) {
    console.error(error);
  }

  panel.append(img);

  const options = document.createElement("div");
  options.className = "answer-options";

  const distractors = shuffle(state.people.filter((item) => item.id !== person.id))
    .slice(0, Math.min(game.choiceCount - 1, state.people.length - 1));

  const choices = shuffle([person, ...distractors]);
  const feedback = createFeedback(panel);

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice.name;

    button.addEventListener("click", () => {
      if (button.disabled) return;

      const elapsed = Date.now() - game.questionStartedAt;
      const correct = choice.id === person.id;

      options.querySelectorAll("button").forEach((item) => {
        item.disabled = true;
      });

      recordAnswer(correct, elapsed);
      feedback.textContent = correct
        ? "إجابة صحيحة، برافو! ❤️"
        : `ولا يهمك، الإجابة هي ${person.name}.`;
      feedback.className = `feedback ${correct ? "good" : "bad"}`;

      const nextButton = document.createElement("button");
      nextButton.className = "primary";
      nextButton.textContent = "السؤال التالي";
      nextButton.addEventListener("click", async () => {
        game.index += 1;
        game.questionStartedAt = Date.now();
        await showWhoQuestion();
      });

      panel.append(nextButton);
    });

    options.append(button);
  });

  panel.append(options);

  const hearButton = document.createElement("button");
  hearButton.className = "secondary";
  hearButton.textContent = "اسمع الاسم";
  hearButton.addEventListener("click", () => {
    game.hints += 1;
    if (!speakArabic(person.name)) {
      alert("تشغيل الصوت غير مدعوم في هذا المتصفح.");
    }
  });

  const skipButton = document.createElement("button");
  skipButton.className = "secondary";
  skipButton.textContent = "تخطي السؤال";
  skipButton.addEventListener("click", () => {
    game.skipped += 1;
    game.questionStartedAt = Date.now();
    game.index += 1;
    showWhoQuestion();
  });

  panel.append(hearButton, skipButton);
  addEndButton(panel);
}

/* Game 2: فاكر الحكاية؟ */

async function startClueGame() {
  const game = state.game;
  game.queue = shuffle(state.people.filter((person) => personClue(person)));
  game.index = 0;
  await showClueQuestion();
}

async function showClueQuestion() {
  const game = state.game;
  if (!game) return;

  if (game.index >= game.queue.length) {
    finishGame(false);
    return;
  }

  const person = game.queue[game.index];
  const clueText = personClue(person);
  const panel = gameShell(
    "فاكر الحكاية؟",
    "اقرأ المعلومة وحاول تعرف مين الشخص المقصود."
  );
  addQuestionAudio(
    panel,
    `فاكر الحكاية؟ اقرأ التلميح وحاول تعرف مين الشخص المقصود. ${clueText}`
  );

  const clue = document.createElement("blockquote");
  clue.textContent = clueText;
  panel.append(clue);

  const options = document.createElement("div");
  options.className = "answer-options";

  const others = shuffle(state.people.filter((item) => item.id !== person.id))
    .slice(0, Math.min(game.choiceCount - 1, state.people.length - 1));

  const choices = shuffle([person, ...others]);
  const feedback = createFeedback(panel);

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice.name;

    button.addEventListener("click", () => {
      if (button.disabled) return;

      const elapsed = Date.now() - game.questionStartedAt;
      const correct = choice.id === person.id;

      options.querySelectorAll("button").forEach((item) => {
        item.disabled = true;
      });

      recordAnswer(correct, elapsed);
      feedback.textContent = correct
        ? "صح! حلو إنك افتكرت الحكاية. ❤️"
        : `الإجابة الصحيحة هي ${person.name}.`;
      feedback.className = `feedback ${correct ? "good" : "bad"}`;

      const nextButton = document.createElement("button");
      nextButton.className = "primary";
      nextButton.textContent = "الحكاية التالية";
      nextButton.addEventListener("click", () => {
        game.index += 1;
        game.questionStartedAt = Date.now();
        showClueQuestion();
      });

      panel.append(nextButton);
    });

    options.append(button);
  });

  panel.append(options);

  const hintButton = document.createElement("button");
  hintButton.className = "secondary";
  hintButton.textContent = "تلميح: اسمع الاسم";
  hintButton.addEventListener("click", () => {
    game.hints += 1;
    if (!speakArabic(person.name)) {
      alert("تشغيل الصوت غير مدعوم في هذا المتصفح.");
    }
  });

  const skipButton = document.createElement("button");
  skipButton.className = "secondary";
  skipButton.textContent = "تخطي";
  skipButton.addEventListener("click", () => {
    game.skipped += 1;
    game.index += 1;
    game.questionStartedAt = Date.now();
    showClueQuestion();
  });

  panel.append(hintButton, skipButton);
  addEndButton(panel);
}

function personClue(person) {
  return [
    person.note,
    person.favoriteFood && `أكلته المفضلة ${person.favoriteFood}`,
    person.favoriteSong && `أغنيته المفضلة ${person.favoriteSong}`,
    person.importantPlace && `مكان مميز له ${person.importantPlace}`
  ].filter(Boolean).join(" · ");
}

/* Gentle, unscored reminiscence activity */

function startMemoryJourney(reminderStoryId = "") {
  const allStories = state.stories
    .filter((story) => state.people.some((person) => person.id === story.personId))
    .sort((first, second) =>
      String(first.date || first.createdAt).localeCompare(
        String(second.date || second.createdAt)
      )
    );
  const reminderStory = allStories.find((story) => story.id === reminderStoryId);
  const stories = reminderStory ? [reminderStory] : allStories;

  if (!stories.length) {
    alert("أضيفوا حكاية واحدة على الأقل من قسم «حكايات العيلة» لبدء جلسة الذكريات.");
    showPage("stories");
    return;
  }

  state.memoryJourney = { stories, index: 0 };
  state.game = null;
  state.currentGame = null;
  state.smartRecall = null;
  state.activeMemoryActions = null;
  $("#gameArea")?.classList.remove("hidden");
  showMemoryMoment();
}

async function showMemoryMoment() {
  const journey = state.memoryJourney;
  if (!journey) return;

  if (journey.index >= journey.stories.length) {
    finishMemoryJourney();
    return;
  }

  const story = journey.stories[journey.index];
  const person = state.people.find((item) => item.id === story.personId);
  if (!person) {
    journey.index += 1;
    await showMemoryMoment();
    return;
  }

  const panel = gameShell(
    "جلسة ذكريات هادئة 🌿",
    "خدوا وقتكم. مفيش إجابة مطلوبة، وممكن تتفرجوا أو تسمعوا بس."
  );
  const image = document.createElement("img");
  image.className = "game-photo memory-photo";
  image.alt = `صورة ${person.name}`;
  try {
    const url = await photoUrl(person.id);
    if (url) {
      image.src = url;
      image.dataset.objectUrl = url;
      panel.append(image);
    }
  } catch (error) {
    console.error(`Could not load memory photo for ${person.name}:`, error);
  }

  const title = document.createElement("h3");
  title.textContent = story.title;
  const relation = document.createElement("p");
  relation.className = "memory-cue";
  relation.textContent = `دي ذكرى مرتبطة بـ ${person.name}، ${person.relation}.`;
  const invitation = document.createElement("p");
  invitation.className = "memory-invitation";
  invitation.textContent = "لو حابين، احكوا مع بعض عن الصورة أو الإحساس اللي بتفكّركم بيه.";
  panel.append(title, relation, invitation);

  const cues = [
    person.note && `معلومة عنه: ${person.note}`,
    person.favoriteFood && `كان بيحب ${person.favoriteFood}.`,
    person.favoriteSong && `أغنية بتحبوها له: ${person.favoriteSong}.`,
    person.importantPlace && `مكان مميز: ${person.importantPlace}.`
  ].filter(Boolean);
  const cue = document.createElement("p");
  cue.className = "memory-cue hidden";
  cue.setAttribute("aria-live", "polite");
  cue.textContent = cues[0] || "ممكن تكتفوا بمشاهدة الصورة معًا.";
  panel.append(cue);

  const storyText = document.createElement("p");
  storyText.className = "story-content hidden";
  storyText.textContent = story.text;
  panel.append(storyText);

  if (story.hasAudio || person.hasAudio) {
    try {
      const recording = await getMemoryAudio(story, person);
      if (recording) {
        const player = document.createElement("audio");
        player.controls = true;
        player.preload = "none";
        player.setAttribute("aria-label", `تسجيل حكاية ${story.title}`);
        const url = URL.createObjectURL(recording);
        player.src = url;
        player.dataset.objectUrl = url;
        panel.append(player);
      }
    } catch (error) {
      console.error(`Could not load memory story audio ${story.id}:`, error);
    }
  }

  const actions = document.createElement("div");
  actions.className = "actions memory-actions";

  const cueButton = document.createElement("button");
  cueButton.className = "secondary";
  cueButton.textContent = "معلومة تساعد على التذكّر";
  cueButton.disabled = !cues.length;
  cueButton.addEventListener("click", () => {
    cue.classList.remove("hidden");
    cueButton.disabled = true;
  });

  const showStoryButton = document.createElement("button");
  showStoryButton.className = "secondary";
  showStoryButton.textContent = "اقرؤوا الحكاية معًا";
  showStoryButton.addEventListener("click", () => {
    storyText.classList.remove("hidden");
    if (!story.hasAudio && !person.hasAudio) speakArabic(`${story.title}. ${story.text}`);
    showStoryButton.disabled = true;
  });

  const nextButton = document.createElement("button");
  nextButton.className = "primary";
  nextButton.textContent = journey.index === journey.stories.length - 1
    ? "إنهاء والعودة"
    : "الذكرى التالية";
  nextButton.addEventListener("click", () => {
    journey.index += 1;
    showMemoryMoment();
  });

  const endButton = document.createElement("button");
  endButton.className = "secondary";
  endButton.textContent = "إنهاء الجلسة الآن";
  endButton.addEventListener("click", finishMemoryJourney);
  actions.append(cueButton, showStoryButton, nextButton, endButton);
  panel.append(actions);
  state.activeMemoryActions = {
    hint: () => cueButton.click(),
    story: () => showStoryButton.click(),
    next: () => nextButton.click(),
    finish: finishMemoryJourney
  };
}

function finishMemoryJourney() {
  state.memoryJourney = null;
  state.activeMemoryActions = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const panel = gameShell(
    "شكرًا على الوقت الجميل ❤️",
    "مفيش نتيجة أو اختبار. ممكن تحتفظوا باللحظة أو تنهوا الجلسة براحتكم."
  );
  const backButton = document.createElement("button");
  backButton.className = "primary";
  backButton.textContent = "العودة للأنشطة";
  backButton.addEventListener("click", () => showPage("games"));
  panel.append(backButton);
}

/* Game 3: ترتيب العيلة */

function startOrderGame() {
  const game = state.game;

  game.queue = shuffle(state.people);
  game.orderAttempts = 0;

  const panel = gameShell(
    "ترتيب العيلة",
    "رتّب أفراد العيلة من الأكبر للأصغر حسب العمر المدخل. تقدر تحرّك كل اسم لفوق أو لتحت."
  );
  addQuestionAudio(
    panel,
    "رتّب أفراد العيلة من الأكبر للأصغر حسب العمر المدخل. تقدر تحرّك كل اسم لفوق أو لتحت."
  );

  if (game.queue.some((person) => !Number.isFinite(person.age))) {
    const warning = document.createElement("p");
    warning.className = "feedback";
    warning.textContent =
      "ملحوظة: بعض الأعمار مش متسجلة؛ النتيجة مش هتتحسب بدقة إلا بعد إدخال الأعمار المعروفة.";
    panel.append(warning);
  }

  const list = document.createElement("div");
  list.className = "order-list";
  list.setAttribute("aria-label", "قائمة ترتيب أفراد العيلة");

  function renderOrderList() {
    list.replaceChildren();

    game.queue.forEach((person, index) => {
      const row = document.createElement("div");
      row.className = "session-row";

      const name = document.createElement("span");
      name.textContent = person.name;

      const controls = document.createElement("div");
      controls.className = "actions";

      const up = document.createElement("button");
      up.className = "secondary";
      up.textContent = "↑";
      up.setAttribute("aria-label", `تحريك ${person.name} لأعلى`);
      up.disabled = index === 0;
      up.addEventListener("click", () => {
        [game.queue[index - 1], game.queue[index]] =
          [game.queue[index], game.queue[index - 1]];
        renderOrderList();
      });

      const down = document.createElement("button");
      down.className = "secondary";
      down.textContent = "↓";
      down.setAttribute("aria-label", `تحريك ${person.name} لأسفل`);
      down.disabled = index === game.queue.length - 1;
      down.addEventListener("click", () => {
        [game.queue[index + 1], game.queue[index]] =
          [game.queue[index], game.queue[index + 1]];
        renderOrderList();
      });

      controls.append(up, down);
      row.append(name, controls);
      list.append(row);
    });
  }

  renderOrderList();
  panel.append(list);

  const feedback = createFeedback(panel);

  const checkButton = document.createElement("button");
  checkButton.className = "primary";
  checkButton.textContent = "تحقق من الترتيب";
  checkButton.addEventListener("click", () => {
    game.orderAttempts += 1;

    const allAgesKnown = game.queue.every((person) =>
      Number.isFinite(person.age)
    );

    if (!allAgesKnown) {
      feedback.textContent =
        "مش هنقدر نقيس الدقة لحد ما الأعمار المعروفة تتسجل. تقدر تنهي الجلسة من غير حساب دقة الترتيب.";
      feedback.className = "feedback bad";
      return;
    }

    const expected = [...game.queue].sort((a, b) => b.age - a.age);
    const correct = game.queue.every(
      (person, index) => person.id === expected[index].id
    );

    recordAnswer(correct, Date.now() - game.questionStartedAt);
    feedback.textContent = correct
      ? "الترتيب صحيح! أحسنت. ❤️"
      : "لسه فيه اختلاف بسيط. جرّب تاني براحتك.";
    feedback.className = `feedback ${correct ? "good" : "bad"}`;

    if (correct) {
      checkButton.disabled = true;
      const finishButton = document.createElement("button");
      finishButton.className = "primary";
      finishButton.textContent = "حفظ النتيجة";
      finishButton.addEventListener("click", () => finishGame(false));
      panel.append(finishButton);
    } else {
      game.questionStartedAt = Date.now();
    }
  });

  panel.append(checkButton);
  addEndButton(panel);
}

/* Save and display research sessions */

function getTimeOfDay() {
  return $("#sessionTime")?.value || "unspecified";
}

function finishGame(manualEnd) {
  const game = state.game;
  if (!game) return;

  const durationMs = Date.now() - game.startedAt;
  const accuracy = game.answered
    ? Math.round((game.correct / game.answered) * 100)
    : null;

  const avgResponseMs = game.responseTimes.length
    ? Math.round(
        game.responseTimes.reduce((sum, value) => sum + value, 0) /
        game.responseTimes.length
      )
    : null;

  const session = {
    id: makeId(),
    participantCode: game.participantCode,
    gameType: game.type,
    difficulty: game.difficulty,
    voiceEnabled: game.autoReadQuestions,
    timeOfDay: getTimeOfDay(),
    date: new Date().toISOString(),
    durationMs,
    accuracy,
    correct: game.correct,
    answered: game.answered,
    hints: game.hints,
    skipped: game.skipped,
    avgResponseMs,
    manuallyEnded: Boolean(manualEnd),
    orderAttempts: game.orderAttempts || 0
  };

  state.sessions.push(session);
  saveSessions();

  state.game = null;
  state.currentGame = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  const panel = gameShell("انتهت الجلسة ❤️", "شكرًا لمشاركتك. مفيش إجابة غلط تستدعي الزعل.");

  const summary = document.createElement("div");
  summary.className = "stats-grid";

  const values = [
    ["الإجابات الصحيحة", `${session.correct} من ${session.answered}`],
    ["الدقة", session.accuracy === null ? "غير متاحة" : `${session.accuracy}%`],
    ["التلميحات", String(session.hints)],
    ["الأسئلة المتخطاة", String(session.skipped)],
    ["متوسط زمن الإجابة", session.avgResponseMs === null
      ? "غير متاح"
      : `${(session.avgResponseMs / 1000).toFixed(1)} ثانية`],
    ["مستوى الصعوبة", difficultyName(session.difficulty)],
    ["الوقت الكلي", `${Math.round(session.durationMs / 1000)} ثانية`]
  ];
  values.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "stat-card";

    const title = document.createElement("span");
    title.textContent = label;

    const result = document.createElement("strong");
    result.textContent = value;

    card.append(title, result);
    summary.append(card);
  });

  const message = document.createElement("p");
  message.textContent =
    "النتائج دي وصفية للجلسة دي فقط، ومش تشخيص طبي ولا دليل لوحدها على تحسّن الذاكرة.";

  const researchButton = document.createElement("button");
  researchButton.className = "primary";
  researchButton.textContent = "عرض النتائج";
  researchButton.addEventListener("click", () => showPage("research"));

  panel.append(summary, message, researchButton);
  updateHome();
}

/* Research dashboard */

function renderResearch() {
  const sessions = state.sessions;

  const count = $("#sessionCount");
  const accuracy = $("#averageAccuracy");
  const time = $("#averageTime");
  const list = $("#sessionList");

  if (count) count.textContent = sessions.length;

  const sessionsWithAccuracy = sessions.filter(
    (session) => Number.isFinite(session.accuracy)
  );

  const avgAccuracy = sessionsWithAccuracy.length
    ? Math.round(
        sessionsWithAccuracy.reduce((sum, session) => sum + session.accuracy, 0) /
        sessionsWithAccuracy.length
      )
    : null;

  const sessionsWithTime = sessions.filter(
    (session) => Number.isFinite(session.avgResponseMs)
  );

  const avgTime = sessionsWithTime.length
    ? Math.round(
        sessionsWithTime.reduce((sum, session) => sum + session.avgResponseMs, 0) /
        sessionsWithTime.length
      )
    : null;

  if (accuracy) accuracy.textContent = avgAccuracy === null ? "—" : `${avgAccuracy}%`;
  if (time) time.textContent = avgTime === null ? "—" : `${(avgTime / 1000).toFixed(1)} ث`;

  if (list) {
    list.replaceChildren();

    if (!sessions.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "لسه مفيش جلسات محفوظة.";
      list.append(empty);
    } else {
      [...sessions].reverse().forEach((session) => {
        const row = document.createElement("div");
        row.className = "session-row";

        const details = document.createElement("div");
        const date = new Date(session.date);

        const title = document.createElement("strong");
        title.textContent =
          `${gameName(session.gameType)} — ${session.participantCode}` +
          (session.difficulty ? ` · ${difficultyName(session.difficulty)}` : "");

        const subtitle = document.createElement("div");
        subtitle.className = "muted";
        subtitle.textContent =
          `${date.toLocaleString(getLocaleTag())} • ${translatedPhrase({
            morning: "الصباح",
            afternoon: "بعد الظهر",
            evening: "المساء"
          }[session.timeOfDay] || session.timeOfDay)}`;

        details.append(title, subtitle);

        const result = document.createElement("span");
        result.textContent = session.accuracy === null
          ? "الدقة: غير متاحة"
          : `الدقة: ${session.accuracy}%`;

        row.append(details, result);
        list.append(row);
      });
    }
  }

  drawChart(sessions);
}

function gameName(type) {
  const name = ({
    who: "مين ده؟",
    clue: "فاكر الحكاية؟",
    voice: "مين بيتكلم؟",
    order: "ترتيب العيلة"
  })[type] || type;
  return translatedPhrase(name);
}

function drawChart(sessions) {
  const canvas = $("#resultsChart");
  if (!canvas) return;

  const width = Math.max(canvas.clientWidth || 600, 300);
  const height = 220;
  const scale = window.devicePixelRatio || 1;

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.clearRect(0, 0, width, height);

  const data = sessions
    .filter((session) => Number.isFinite(session.accuracy))
    .slice(-10);
  const styles = getComputedStyle(document.body);
  const mutedColor = styles.getPropertyValue("--muted").trim();
  const borderColor = styles.getPropertyValue("--border").trim();
  const primaryColor = styles.getPropertyValue("--primary").trim();
  const textColor = styles.getPropertyValue("--text").trim();

  context.fillStyle = mutedColor;
  context.font = "12px Tahoma, Arial";
  context.textAlign = "center";

  if (!data.length) {
    context.fillText(
      translatedPhrase("هتظهر النتائج هنا بعد حفظ أول جلسة"),
      width / 2,
      height / 2
    );
    return;
  }

  const padding = { top: 25, bottom: 38, left: 32, right: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  [0, 25, 50, 75, 100].forEach((value) => {
    const y = padding.top + chartHeight - (value / 100) * chartHeight;

    context.strokeStyle = borderColor;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    context.fillStyle = mutedColor;
    context.textAlign = document.documentElement.dir === "rtl" ? "right" : "left";
    context.fillText(`${value}%`, padding.left - 6, y + 4);
  });

  const slot = chartWidth / data.length;
  const barWidth = Math.min(34, slot * 0.55);

  data.forEach((session, index) => {
    const barHeight = (session.accuracy / 100) * chartHeight;
    const x = padding.left + slot * index + (slot - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;

    context.fillStyle = primaryColor;
    context.fillRect(x, y, barWidth, barHeight);

    context.fillStyle = textColor;
    context.textAlign = "center";
    context.fillText(
      `${session.accuracy}%`,
      x + barWidth / 2,
      Math.max(y - 6, 12)
    );

    context.fillStyle = mutedColor;
    context.fillText(
      String(index + 1),
      x + barWidth / 2,
      height - 15
    );
  });
}

window.addEventListener("resize", () => {
  if (!$("#research")?.classList.contains("hidden")) {
    drawChart(state.sessions);
  }
});

/* CSV and JSON export */

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

$("#exportCsv")?.addEventListener("click", () => {
  const columns = [
    "participantCode",
    "gameType",
    "difficulty",
    "voiceEnabled",
    "timeOfDay",
    "date",
    "durationMs",
    "accuracy",
    "correct",
    "answered",
    "hints",
    "skipped",
    "avgResponseMs",
    "manuallyEnded",
    "orderAttempts"
  ];

  const rows = [
    columns,
    ...state.sessions.map((session) =>
      columns.map((column) => session[column] ?? "")
    )
  ];

  const csv = "\uFEFF" + rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  downloadFile("zakerty-sessions.csv", csv, "text/csv;charset=utf-8");
});



async function exportBackup() {
  const backup = {
    app: "Zakerty",
    exportedAt: new Date().toISOString(),
    people: [],
    stories: [],
    sessions: state.sessions
  };

  for (const person of state.people) {
    let imageData = null;
    let audioData = null;

    try {
      const blob = await getPhoto(person.id);
      if (!blob) {
        throw new Error(`الصورة غير متاحة للشخص ${person.name}.`);
      }
      imageData = await blobToDataUrl(blob);
    } catch (error) {
      console.error("Could not export image:", error);
      throw new Error(`تعذر تضمين صورة ${person.name} في النسخة الاحتياطية.`);
    }

    if (person.hasAudio) {
      try {
        const blob = await getAudio(person.id);
        if (!blob) throw new Error("Recording is missing.");
        audioData = await blobToDataUrl(blob);
      } catch (error) {
        console.error("Could not export voice recording:", error);
        throw new Error(`تعذر تضمين تسجيل ${person.name} في النسخة الاحتياطية.`);
      }
    }

    backup.people.push({ ...person, imageData, audioData });
  }

  for (const story of state.stories) {
    let audioData = null;
    if (story.hasAudio) {
      try {
        const blob = await getStoryAudio(story.id);
        if (!blob) throw new Error("Recording is missing.");
        audioData = await blobToDataUrl(blob);
      } catch (error) {
        console.error("Could not export story recording:", error);
        throw new Error(`تعذر تضمين تسجيل الحكاية «${story.title}» في النسخة الاحتياطية.`);
      }
    }
    backup.stories.push({ ...story, audioData });
  }

  if (!crypto.subtle) {
    throw new Error("التشفير غير متاح في هذا المتصفح. افتحوا التطبيق عبر الخادم المحلي.");
  }
  const password = await requestBackupPassword("export");
  if (password === null) return;

  const encrypted = await encryptBackup(backup, password);
  downloadFile(
    "zakerty-backup-encrypted.json",
    JSON.stringify(encrypted, null, 2),
    "application/json;charset=utf-8"
  );
}

function requestBackupPassword(mode) {
  const dialog = $("#backupPasswordDialog");
  const form = $("#backupPasswordForm");
  const passwordInput = $("#backupPassword");
  const confirmationInput = $("#backupPasswordConfirm");
  const confirmationField = $("#backupPasswordConfirmField");
  const error = $("#backupPasswordError");
  const title = $("#backupPasswordTitle");
  const submit = $("#submitBackupPassword");
  const exporting = mode === "export";

  form.reset();
  error.textContent = "";
  title.textContent = exporting ? "تشفير النسخة الاحتياطية" : "فك تشفير النسخة";
  confirmationField.classList.toggle("hidden", !exporting);
  confirmationInput.required = exporting;
  submit.textContent = exporting ? "تشفير وتنزيل" : "استعادة النسخة";
  $("#backupPasswordHelp").textContent = exporting
    ? "اختاروا كلمة مرور لا تقل عن 8 أحرف. لن نستطيع استعادة النسخة من دونها."
    : "أدخلوا كلمة المرور التي استخدمتموها عند إنشاء النسخة.";

  return new Promise((resolve) => {
    const handleSubmit = (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (exporting && passwordInput.value !== confirmationInput.value) {
        error.textContent = "كلمتا المرور غير متطابقتين.";
        confirmationInput.focus();
        return;
      }
      dialog.close("accepted");
    };
    const handleClose = () => {
      form.removeEventListener("submit", handleSubmit);
      const password = dialog.returnValue === "accepted" ? passwordInput.value : null;
      form.reset();
      resolve(password);
    };

    form.addEventListener("submit", handleSubmit);
    dialog.addEventListener("close", handleClose, { once: true });
    dialog.returnValue = "";
    dialog.showModal();
    passwordInput.focus();
  });
}

$("#closeBackupPassword")?.addEventListener("click", () => {
  $("#backupPasswordDialog")?.close();
});
$("#cancelBackupPassword")?.addEventListener("click", () => {
  $("#backupPasswordDialog")?.close();
});

async function handleBackupExport() {
  try {
    await exportBackup();
  } catch (error) {
    console.error("Backup export failed:", error);
    alert(error.message || "تعذر تصدير النسخة الاحتياطية.");
  }
}

$("#exportJson")?.addEventListener("click", handleBackupExport);
$("#exportJsonSettings")?.addEventListener("click", handleBackupExport);

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function deriveBackupKey(password, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function encryptBackup(backup, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(backup));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  return {
    app: "Zakerty",
    encrypted: true,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: 250000,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
}

async function decryptBackup(envelope, password) {
  if (
    envelope.algorithm !== "AES-GCM" ||
    envelope.kdf !== "PBKDF2-SHA-256" ||
    envelope.iterations !== 250000 ||
    typeof envelope.salt !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("صيغة النسخة الاحتياطية المشفّرة غير معروفة.");
  }
  try {
    const key = await deriveBackupKey(password, base64ToBytes(envelope.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.ciphertext)
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch (error) {
    console.error("Could not decrypt backup:", error);
    throw new Error("تعذر فك النسخة. تأكدوا من كلمة المرور وصحة الملف.");
  }
}

/* Restore a backup from JSON */

async function restoreBackup(file) {
  const text = await file.text();
  let backup = JSON.parse(text);
  if (backup?.encrypted === true) {
    if (!crypto.subtle) {
      throw new Error("فك التشفير غير متاح. افتحوا التطبيق عبر الخادم المحلي.");
    }
    const password = await requestBackupPassword("restore");
    if (password === null) return false;
    backup = await decryptBackup(backup, password);
  }

  if (!backup || !Array.isArray(backup.people) || !Array.isArray(backup.sessions)) {
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  }
  const backupStories = backup.stories || [];
  if (!Array.isArray(backupStories)) {
    throw new Error("قائمة الحكايات في النسخة الاحتياطية غير صالحة.");
  }

  const ids = new Set();
  for (const person of backup.people) {
    if (
      !person ||
      typeof person.id !== "string" ||
      !person.id ||
      typeof person.name !== "string" ||
      !person.name.trim() ||
      typeof person.relation !== "string" ||
      !person.relation.trim() ||
      (person.birthday && !isValidBirthday(person.birthday)) ||
      ids.has(person.id)
    ) {
      throw new Error("بيانات أحد أفراد العيلة في النسخة غير صالحة.");
    }

    if (
      typeof person.imageData !== "string" ||
      !person.imageData.startsWith("data:image/")
    ) {
      throw new Error(`صورة ${person.name} غير موجودة في النسخة الاحتياطية.`);
    }

    if (
      person.audioData !== undefined &&
      person.audioData !== null &&
      (typeof person.audioData !== "string" ||
        !person.audioData.startsWith("data:audio/"))
    ) {
      throw new Error(`التسجيل الصوتي لـ ${person.name} غير صالح.`);
    }

    ids.add(person.id);
  }

  const storyIds = new Set();
  for (const story of backupStories) {
    if (
      !story ||
      typeof story.id !== "string" ||
      !story.id ||
      storyIds.has(story.id) ||
      typeof story.title !== "string" ||
      !story.title.trim() ||
      typeof story.text !== "string" ||
      !story.text.trim() ||
      typeof story.personId !== "string" ||
      (story.date && !/^\d{4}-\d{2}-\d{2}$/.test(story.date)) ||
      (story.audioData !== undefined &&
        story.audioData !== null &&
        (typeof story.audioData !== "string" || !story.audioData.startsWith("data:audio/")))
    ) {
      throw new Error("بيانات إحدى الحكايات في النسخة الاحتياطية غير صالحة.");
    }
    storyIds.add(story.id);
  }

  const restoredPeople = [];
  const restoredPhotos = [];
  const restoredAudio = [];
  const restoredStories = [];
  const restoredStoryAudio = [];
  for (const person of backup.people) {
    const response = await fetch(person.imageData);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > 12 * 1024 * 1024) {
      throw new Error(`صورة ${person.name} غير صالحة أو أكبر من 12 ميجابايت.`);
    }
    restoredPhotos.push({ id: person.id, blob });
    if (person.audioData) {
      const audioResponse = await fetch(person.audioData);
      const audioBlob = await audioResponse.blob();
      if (!audioBlob.type.startsWith("audio/") || audioBlob.size > MAX_AUDIO_SIZE) {
        throw new Error(`تسجيل ${person.name} غير صالح أو أكبر من 12 ميجابايت.`);
      }
      restoredAudio.push({ id: person.id, blob: audioBlob });
    }
    const { imageData, audioData, ...metadata } = person;
    restoredPeople.push({ ...metadata, hasAudio: Boolean(audioData) });
  }
  for (const story of backupStories) {
    if (story.audioData) {
      const audioResponse = await fetch(story.audioData);
      const audioBlob = await audioResponse.blob();
      if (!audioBlob.type.startsWith("audio/") || audioBlob.size > MAX_AUDIO_SIZE) {
        throw new Error(`تسجيل حكاية «${story.title}» غير صالح أو أكبر من 12 ميجابايت.`);
      }
      restoredStoryAudio.push({ id: story.id, blob: audioBlob });
    }
    const { audioData, ...metadata } = story;
    restoredStories.push({ ...metadata, hasAudio: Boolean(audioData) });
  }
  validateFamilyTree(restoredPeople);

  const previousPeople = state.people;
  const previousSessions = state.sessions;
  const previousStories = state.stories;
  const previousPeopleStorage = localStorage.getItem(STORAGE_KEY);
  const previousSessionsStorage = localStorage.getItem(SESSIONS_KEY);
  const previousStoriesStorage = localStorage.getItem(STORIES_KEY);

  for (const photo of restoredPhotos) {
    await savePhoto(photo.id, photo.blob);
  }
  const restoredAudioIds = new Set(restoredAudio.map((recording) => recording.id));
  for (const person of restoredPeople) {
    if (!restoredAudioIds.has(person.id)) await deleteAudio(person.id);
  }
  for (const recording of restoredAudio) {
    await saveAudio(recording.id, recording.blob);
  }
  for (const story of restoredStories) {
    if (!restoredStoryAudio.some((recording) => recording.id === story.id)) {
      await deleteStoryAudio(story.id);
    }
  }
  for (const recording of restoredStoryAudio) {
    await saveStoryAudio(recording.id, recording.blob);
  }

  state.people = restoredPeople;
  state.sessions = backup.sessions;
  state.stories = restoredStories;

  try {
    savePeople();
    saveSessions();
    saveStories();
  } catch (error) {
    state.people = previousPeople;
    state.sessions = previousSessions;
    state.stories = previousStories;
    try {
      if (previousPeopleStorage === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, previousPeopleStorage);
      }

      if (previousSessionsStorage === null) {
        localStorage.removeItem(SESSIONS_KEY);
      } else {
        localStorage.setItem(SESSIONS_KEY, previousSessionsStorage);
      }
      if (previousStoriesStorage === null) {
        localStorage.removeItem(STORIES_KEY);
      } else {
        localStorage.setItem(STORIES_KEY, previousStoriesStorage);
      }
    } catch (rollbackError) {
      console.error("Could not roll back local storage after restore:", rollbackError);
    }
    throw error;
  }

  const restoredIds = new Set(restoredPeople.map((person) => person.id));
  await Promise.all(
    previousPeople
      .filter((person) => !restoredIds.has(person.id))
      .flatMap((person) => [deletePhoto(person.id), deleteAudio(person.id)])
  );
  const restoredStoryIds = new Set(restoredStories.map((story) => story.id));
  await Promise.all(
    previousStories
      .filter((story) => !restoredStoryIds.has(story.id))
      .map((story) => deleteStoryAudio(story.id))
  );

  await renderFamily();
  await renderStories();
  renderResearch();
  updateHome();
  return true;
}

/* Settings */

$("#backupBtn")?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!confirm("استعادة النسخة هتستبدل البيانات الحالية. هل عملتي نسخة من بياناتك الحالية؟")) {
      return;
    }

    try {
      const restored = await restoreBackup(file);
      if (restored) alert("تمت استعادة النسخة الاحتياطية.");
    } catch (error) {
      console.error(error);
      alert(error.message || "محصلش استعادة للنسخة. اتأكدي إن الملف نسخة صحيحة من ذاكرتي.");
    }
  });

  input.click();
});

function applyAccessibilitySettings() {
  const settings = getAccessibilitySettings();
  const fontSize = Math.min(22, Math.max(14, Number(settings.fontSize) || 16));
  const lineSpacing = Math.min(2.4, Math.max(1.4, Number(settings.lineSpacing) || 1.7));
  const letterSpacing = Math.min(0.1, Math.max(0, Number(settings.letterSpacing) || 0));
  const speechRate = Math.min(1.4, Math.max(0.6, Number(settings.speechRate) || 0.9));
  const repeats = [1, 2, 3].includes(Number(settings.instructionRepeats))
    ? Number(settings.instructionRepeats)
    : 1;
  document.documentElement.style.setProperty("--base-font-size", `${fontSize}px`);
  document.documentElement.style.setProperty("--line-height", String(lineSpacing));
  document.documentElement.style.setProperty("--letter-spacing", `${letterSpacing}em`);
  document.body.classList.toggle("high-contrast", settings.highContrast === true);
  document.body.classList.toggle("dark", settings.theme === "dark");
  document.body.classList.toggle("comfort", settings.comfortMode === true);
  document.body.classList.toggle("reduce-motion", settings.reduceMotion === true);

  const controls = {
    uiLanguage: settings.language,
    themeMode: settings.theme === "dark" ? "dark" : "light",
    instructionRepeats: String(repeats),
    lineSpacing: String(lineSpacing.toFixed(1)),
    letterSpacing: String(letterSpacing.toFixed(2)),
    speechRate: String(speechRate.toFixed(1))
  };
  Object.entries(controls).forEach(([id, value]) => {
    const control = $(`#${id}`);
    if (control) control.value = value;
  });
  const checkboxes = {
    highContrast: settings.highContrast === true,
    comfortMode: settings.comfortMode === true,
    reduceMotion: settings.reduceMotion === true
  };
  Object.entries(checkboxes).forEach(([id, checked]) => {
    const control = $(`#${id}`);
    if (control) control.checked = checked;
  });

  $("#lineSpacingValue").textContent = lineSpacing.toFixed(1);
  $("#letterSpacingValue").textContent = `${letterSpacing.toFixed(2)}em`;
  $("#speechRateValue").textContent = `${speechRate.toFixed(1)}×`;
  applyLanguageSettings(settings.language);
  if (!$("#research")?.classList.contains("hidden")) drawChart(state.sessions);
}

function updateAccessibilitySettings(change) {
  const current = getAccessibilitySettings();
  const next = { ...current, ...change };
  try {
    localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(next));
    applyAccessibilitySettings();
  } catch (error) {
    console.error("Could not save accessibility settings:", error);
    alert("تعذر حفظ إعداد سهولة القراءة على هذا الجهاز.");
  }
}

$("#fontDecrease")?.addEventListener("click", () => {
  const settings = getAccessibilitySettings();
  const current = Number(settings.fontSize);
  updateAccessibilitySettings({ fontSize: Math.max(14, current - 1) });
});
$("#fontIncrease")?.addEventListener("click", () => {
  const settings = getAccessibilitySettings();
  const current = Number(settings.fontSize);
  updateAccessibilitySettings({ fontSize: Math.min(22, current + 1) });
});
$("#fontReset")?.addEventListener("click", () => {
  updateAccessibilitySettings({ fontSize: 16 });
});
$("#highContrast")?.addEventListener("change", (event) => {
  updateAccessibilitySettings({ highContrast: event.target.checked });
});
$("#uiLanguage")?.addEventListener("change", (event) => {
  updateAccessibilitySettings({ language: event.target.value });
});
$("#themeMode")?.addEventListener("change", (event) => {
  updateAccessibilitySettings({ theme: event.target.value });
});
$("#comfortMode")?.addEventListener("change", (event) => {
  updateAccessibilitySettings({ comfortMode: event.target.checked });
});
$("#reduceMotion")?.addEventListener("change", (event) => {
  updateAccessibilitySettings({ reduceMotion: event.target.checked });
});
$("#lineSpacing")?.addEventListener("input", (event) => {
  updateAccessibilitySettings({ lineSpacing: Number(event.target.value) });
});
$("#letterSpacing")?.addEventListener("input", (event) => {
  updateAccessibilitySettings({ letterSpacing: Number(event.target.value) });
});
$("#speechRate")?.addEventListener("input", (event) => {
  updateAccessibilitySettings({ speechRate: Number(event.target.value) });
});
$("#instructionRepeats")?.addEventListener("change", (event) => {
  updateAccessibilitySettings({ instructionRepeats: Number(event.target.value) });
});

$("#clearDataBtn")?.addEventListener("click", async () => {
  const confirmation = prompt(
    "لحذف بيانات الأشخاص والجلسات من الجهاز، اكتبي: حذف"
  );

  if (confirmation !== "حذف") return;

  const ids = state.people.map((person) => person.id);
  const storyIds = state.stories.map((story) => story.id);

  state.people = [];
  state.sessions = [];
  state.stories = [];

  savePeople();
  saveSessions();
  saveStories();

  await Promise.all(
    ids.flatMap((id) => [deletePhoto(id), deleteAudio(id)])
  );
  await Promise.all(storyIds.map((id) => deleteStoryAudio(id)));

  await renderFamily();
  await renderStories();
  renderResearch();
  updateHome();

  alert("تم حذف البيانات المحلية المسجلة في التطبيق.");
});

/* Optional service worker: offline caching after first visit */

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Offline support could not be enabled:", error);
    });
  });
}

/* Initial load */

async function init() {
  const status = $(".status");

  try {
    await openPhotoDB();
    if (status) status.textContent = "البيانات محفوظة على هذا الجهاز";
  } catch {
    if (status) status.textContent = "تخزين الصور غير متاح في هذا المتصفح";
  }

  updateHome();
  renderResearch();
  applyAccessibilitySettings();
  await renderStories();
  await renderFamily();
  await loadReminderSettings();
  const reminderOpened = new URLSearchParams(location.search).get("fromReminder") === "1";
  if (reminderOpened) {
    history.replaceState(null, "", `${location.pathname}${location.hash}`);
    const reminderStory = state.stories.find(
      (story) => story.id === state.reminderMemoryId
    );
    if (reminderStory) {
      showPage("games");
      startMemoryJourney(reminderStory.id);
    } else {
      showPage("home");
      setTimeout(() => {
        $("#weeklyChallengeButton")?.focus();
      }, 0);
    }
  }
}

init();
