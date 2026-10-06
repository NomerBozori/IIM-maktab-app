import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// ============================================================
//  Tarimalar: uz / ru / en
// ============================================================
const T = {
  'app.name': { uz: 'Intellekt Innovatsion Maktabi', ru: 'Интеллект Инновационная Школа', en: 'Intellect Innovation School' },
  'app.short': { uz: 'Intellekt', ru: 'Интеллект', en: 'Intellect' },

  // umumiy
  'c.login': { uz: 'Kirish', ru: 'Войти', en: 'Sign in' },
  'c.logout': { uz: 'Chiqish', ru: 'Выйти', en: 'Sign out' },
  'c.save': { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
  'c.cancel': { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  'c.close': { uz: 'Yopish', ru: 'Закрыть', en: 'Close' },
  'c.send': { uz: 'Yuborish', ru: 'Отправить', en: 'Send' },
  'c.all': { uz: 'Barchasi', ru: 'Все', en: 'All' },
  'c.today': { uz: 'Bugun', ru: 'Сегодня', en: 'Today' },
  'c.loading': { uz: 'Yuklanmoqda…', ru: 'Загрузка…', en: 'Loading…' },
  'c.coins': { uz: 'Coinlar', ru: 'Монеты', en: 'Coins' },
  'c.coin': { uz: 'Coin', ru: 'Монета', en: 'Coin' },
  'c.student': { uz: "O'quvchi", ru: 'Ученик', en: 'Student' },
  'c.teacher': { uz: 'Ustoz', ru: 'Учитель', en: 'Teacher' },
  'c.director': { uz: 'Direktor', ru: 'Директор', en: 'Director' },
  'c.subject': { uz: 'Fan', ru: 'Предмет', en: 'Subject' },
  'c.class': { uz: 'Sinf', ru: 'Класс', en: 'Class' },
  'c.classes': { uz: 'Sinflar', ru: 'Классы', en: 'Classes' },
  'c.date': { uz: 'Sana', ru: 'Дата', en: 'Date' },
  'c.hours': { uz: 'soat', ru: 'часов', en: 'hours' },
  'c.hour1': { uz: 'soat', ru: 'час', en: 'hour' },
  'c.grade': { uz: 'Baho', ru: 'Оценка', en: 'Grade' },
  'c.grades': { uz: 'Baholar', ru: 'Оценки', en: 'Grades' },
  'c.average': { uz: "O'rtacha", ru: 'Средний', en: 'Average' },
  'c.status': { uz: 'Holat', ru: 'Статус', en: 'Status' },
  'c.reason': { uz: 'Sabab', ru: 'Причина', en: 'Reason' },
  'c.amount': { uz: 'Miqdor', ru: 'Количество', en: 'Amount' },
  'c.left': { uz: 'Qoldi', ru: 'Осталось', en: 'Left' },
  'c.distributed': { uz: 'Tarqatildi', ru: 'Распределено', en: 'Distributed' },
  'c.empty': { uz: "Ma'lumot yo'q", ru: 'Нет данных', en: 'No data' },
  'c.message': { uz: 'Xabar', ru: 'Сообщение', en: 'Message' },
  'c.write': { uz: 'Xabar yozing…', ru: 'Напишите сообщение…', en: 'Write a message…' },
  'c.total': { uz: 'Jami', ru: 'Всего', en: 'Total' },
  'c.day': { uz: 'Kun', ru: 'День', en: 'Day' },
  'c.week': { uz: 'Hafta', ru: 'Неделя', en: 'Week' },
  'c.month': { uz: 'Oy', ru: 'Месяц', en: 'Month' },
  'c.percent': { uz: 'Foiz', ru: 'Процент', en: 'Percent' },
  'c.place': { uz: 'O\'rin', ru: 'Место', en: 'Place' },
  'c.name': { uz: 'Ism', ru: 'Имя', en: 'Name' },
  'c.phone': { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
  'c.role': { uz: 'Rol', ru: 'Роль', en: 'Role' },
  'c.loginField': { uz: 'Login', ru: 'Логин', en: 'Login' },
  'c.password': { uz: 'Parol', ru: 'Пароль', en: 'Password' },
  'c.newPassword': { uz: 'Yangi parol', ru: 'Новый пароль', en: 'New password' },
  'c.displayName': { uz: "Ko'rsatiladigan ism", ru: 'Отображаемое имя', en: 'Display name' },
  'c.description': { uz: 'Tavsif', ru: 'Описание', en: 'Description' },
  'c.title': { uz: 'Nomi', ru: 'Название', en: 'Title' },
  'c.deadline': { uz: 'Muddat', ru: 'Срок', en: 'Deadline' },
  'c.select': { uz: 'Tanlang', ru: 'Выберите', en: 'Select' },
  'c.search': { uz: 'Qidirish…', ru: 'Поиск…', en: 'Search…' },
  'c.saved': { uz: 'Saqlandi', ru: 'Сохранено', en: 'Saved' },
  'c.error': { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' },
  'c.yes': { uz: 'Ha', ru: 'Да', en: 'Yes' },
  'c.no': { uz: "Yo'q", ru: 'Нет', en: 'No' },
  'c.you': { uz: 'Siz', ru: 'Вы', en: 'You' },

  // kirish
  'lg.title': { uz: 'Akkauntga kirish', ru: 'Вход в аккаунт', en: 'Sign in to your account' },
  'lg.sub': { uz: "O'quvchi, ustoz yoki direktor akkauntini tanlang", ru: 'Выберите аккаунт ученика, учителя или директора', en: 'Choose a student, teacher or director account' },
  'lg.demo': { uz: 'Namuna akkauntlar (bir bosishda kirish)', ru: 'Демо-аккаунты (вход в один клик)', en: 'Demo accounts (one-click sign in)' },
  'lg.register': { uz: "Ro'yxatdan o'tish", ru: 'Регистрация', en: 'Register' },
  'lg.haveAcc': { uz: 'Akkauntingiz bormi?', ru: 'Уже есть аккаунт?', en: 'Already have an account?' },
  'lg.noAcc': { uz: 'Akkauntingiz yo\'qmi?', ru: 'Нет аккаунта?', en: "Don't have an account?" },
  'lg.bad': { uz: 'Login yoki parol xato', ru: 'Неверный логин или пароль', en: 'Wrong login or password' },
  'lg.regOk': { uz: "Ro'yxatdan o'tdingiz", ru: 'Вы зарегистрированы', en: 'You are registered' },
  'lg.pickSinf': { uz: 'Sinfingizni tanlang', ru: 'Выберите класс', en: 'Choose your class' },
  'lg.studentDesc': { uz: "Coinlar, baholar, reyting, chat", ru: 'Монеты, оценки, рейтинг, чат', en: 'Coins, grades, ranking, chat' },
  'lg.teacherDesc': { uz: 'Vazifa, davomat, dars jadvali, chat', ru: 'Задания, посещаемость, расписание, чат', en: 'Tasks, attendance, schedule, chat' },
  'lg.directorDesc': { uz: 'Coin belgilash, davomat nazorati, chat', ru: 'Монеты, контроль посещаемости, чат', en: 'Coin budgets, attendance control, chat' },

  // menyu
  'nav.home': { uz: 'Bosh sahifa', ru: 'Главная', en: 'Home' },
  'nav.rankings': { uz: 'Reyting', ru: 'Рейтинг', en: 'Rankings' },
  'nav.chat': { uz: 'Chat', ru: 'Чат', en: 'Chat' },
  'nav.settings': { uz: 'Sozlamalar', ru: 'Настройки', en: 'Settings' },
  'nav.tasks': { uz: 'Vazifalar', ru: 'Задания', en: 'Tasks' },
  'nav.schedule': { uz: 'Dars jadvali', ru: 'Расписание', en: 'Schedule' },
  'nav.attendance': { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  'nav.coins': { uz: 'Coin berish', ru: 'Выдать монеты', en: 'Give coins' },
  'nav.teachers': { uz: 'Ustozlar', ru: 'Учителя', en: 'Teachers' },

  // o'quvchi
  'st.coinsTitle': { uz: 'Mening coinlarim', ru: 'Мои монеты', en: 'My coins' },
  'st.coinsHint': { uz: 'Har belgi 50 coin', ru: 'Каждый значок — 50 монет', en: 'Each icon = 50 coins' },
  'st.tasksTitle': { uz: 'Ustozlar bergan vazifalar', ru: 'Задания от учителей', en: 'Tasks from teachers' },
  'st.tasksEmpty': { uz: 'Hozircha vazifa yo\'q', ru: 'Пока нет заданий', en: 'No tasks yet' },
  'st.markDone': { uz: 'Bajarildi', ru: 'Выполнено', en: 'Mark done' },
  'st.done': { uz: 'Bajarildi', ru: 'Выполнено', en: 'Done' },
  'st.gradesTitle': { uz: 'Fanlar bo\'yicha baholar', ru: 'Оценки по предметам', en: 'Grades by subject' },
  'st.scheduleTitle': { uz: 'Bugungi dars jadvali', ru: 'Расписание на сегодня', en: "Today's schedule" },
  'st.noLessons': { uz: 'Bugun dars yo\'q', ru: 'Сегодня занятий нет', en: 'No lessons today' },
  'st.givenBy': { uz: 'Kim bergan', ru: 'Кто задал', en: 'Given by' },
  'st.attendancePct': { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  'st.monitoringPct': { uz: 'Oylik monitoring', ru: 'Месячный мониторинг', en: 'Monthly monitoring' },
  'st.hello': { uz: 'Salom', ru: 'Привет', en: 'Hello' },
  'st.welcome': { uz: 'Bugun qanday kayfiyatda?', ru: 'Как настроение сегодня?', en: 'How are you today?' },

  // reyting
  'rk.title': { uz: 'Reyting', ru: 'Рейтинг', en: 'Rankings' },
  'rk.sub': { uz: "Bu ilovada ro'yxatdan o'tgan barcha o'quvchilar reytingi", ru: 'Рейтинг всех зарегистрированных учеников', en: 'Ranking of all registered students' },
  'rk.byCoins': { uz: 'Coin bo\'yicha', ru: 'По монетам', en: 'By coins' },
  'rk.byAttendance': { uz: 'Davomat bo\'yicha', ru: 'По посещаемости', en: 'By attendance' },
  'rk.byMonitoring': { uz: 'Oylik monitoring bo\'yicha', ru: 'По месячному мониторингу', en: 'By monthly monitoring' },
  'rk.viewStats': { uz: 'Statistikani ko\'rish', ru: 'Смотреть статистику', en: 'View statistics' },
  'rk.myPlace': { uz: 'Mening o\'rinim', ru: 'Моё место', en: 'My place' },
  'rk.of': { uz: 'dan', ru: 'из', en: 'of' },

  // o'quvchi statistikasi (do'stlar ko'radi)
  'pr.title': { uz: "O'quvchi statistikasi", ru: 'Статистика ученика', en: 'Student statistics' },
  'pr.onlyStats': { uz: "Bu o'quvchining faqat statistikasi ko'rinadi", ru: 'Видна только статистика этого ученика', en: 'Only this student\'s statistics are visible' },
  'pr.class': { uz: 'Sinfi', ru: 'Класс', en: 'Class' },

  // ustoz
  'tc.budgetTitle': { uz: 'Oylik coin byudjeti', ru: 'Месячный бюджет монет', en: 'Monthly coin budget' },
  'tc.budgetDesc': { uz: "Har oy o'quvchilarga tarqatish uchun miqdor olasiz", ru: 'Каждый месяц вы получаете сумму для распределения среди учеников', en: 'Each month you receive an amount to distribute to students' },
  'tc.giveCoins': { uz: 'Coin berish', ru: 'Выдать монеты', en: 'Give coins' },
  'tc.giveTask': { uz: 'Vazifa berish', ru: 'Задать задание', en: 'Assign task' },
  'tc.taskTitle': { uz: 'Vazifa nomi', ru: 'Название задания', en: 'Task title' },
  'tc.createTask': { uz: 'Vazifa yaratish', ru: 'Создать задание', en: 'Create task' },
  'tc.myTasks': { uz: 'Bergan vazifalarim', ru: 'Мои задания', en: 'My tasks' },
  'tc.noTasks': { uz: 'Hozircha vazifa yo\'q', ru: 'Пока нет заданий', en: 'No tasks yet' },
  'tc.scheduleTitle': { uz: 'Dars jadvali', ru: 'Расписание', en: 'Schedule' },
  'tc.dayHours': { uz: 'Kunlik jami soat', ru: 'Всего часов за день', en: 'Total hours per day' },
  'tc.todayLessons': { uz: 'Bugungi darslar', ru: 'Занятия сегодня', en: "Today's lessons" },
  'tc.whichClass': { uz: 'Qaysi sinfga', ru: 'В какой класс', en: 'Which class' },
  'tc.attendanceTitle': { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  'tc.attendanceDesc': { uz: "O'zingiz biriktirilgan sinfning davomatini to'ldiring", ru: 'Заполните посещаемость закреплённого за вами класса', en: 'Fill in attendance for your assigned class' },
  'tc.keldi': { uz: 'Keldi', ru: 'Пришёл', en: 'Present' },
  'tc.ketdi': { uz: 'Ketdi', ru: 'Ушёл', en: 'Left' },
  'tc.kirmadi': { uz: 'Kirmadi', ru: 'Не пришёл', en: 'Absent' },
  'tc.saveAttendance': { uz: 'Davomatni saqlash', ru: 'Сохранить посещаемость', en: 'Save attendance' },
  'tc.attendanceSaved': { uz: 'Davomat saqlandi', ru: 'Посещаемость сохранена', en: 'Attendance saved' },
  'tc.compute': { uz: 'Davomatni hisoblash', ru: 'Посчитать посещаемость', en: 'Compute attendance' },
  'tc.students': { uz: "O'quvchilar", ru: 'Ученики', en: 'Students' },
  'tc.pickStudent': { uz: 'Coin berish uchun o\'quvchini tanlang', ru: 'Выберите ученика, чтобы выдать монеты', en: 'Pick a student to give coins' },
  'tc.give': { uz: 'Berish', ru: 'Выдать', en: 'Give' },
  'tc.coinsGiven': { uz: 'Coin berildi', ru: 'Монеты выданы', en: 'Coins given' },
  'tc.budgetEmpty': { uz: 'Byudjet tugagan', ru: 'Бюджет исчерпан', en: 'Budget used up' },
  'tc.smsFromDirector': { uz: 'Direktordan xabar', ru: 'Сообщение от директора', en: 'Message from director' },
  'tc.noSms': { uz: 'Xabar yo\'q', ru: 'Нет сообщений', en: 'No messages' },
  'tc.myClasses': { uz: 'Mening sinflarim', ru: 'Мои классы', en: 'My classes' },
  'tc.classChat': { uz: 'Sinf chati', ru: 'Чат класса', en: 'Class chat' },
  'tc.individualChat': { uz: 'Har bir o\'quvchi bilan alohida chat', ru: 'Отдельный чат с каждым учеником', en: 'Individual chat with each student' },

  // direktor
  'dr.budgetTitle': { uz: 'Ustozlarga oylik coin belgilash', ru: 'Назначить месячные монеты учителям', en: 'Set monthly coins for teachers' },
  'dr.budgetDesc': { uz: 'Har oy har bir ustozga qancha coin tushishini belgilang', ru: 'Укажите, сколько монет получает каждый учитель каждый месяц', en: 'Set how many coins each teacher receives each month' },
  'dr.setBudget': { uz: 'Coin belgilash', ru: 'Назначить монеты', en: 'Set coins' },
  'dr.budgetSaved': { uz: 'Coin belgilandi', ru: 'Монеты назначены', en: 'Coins set' },
  'dr.monitorTitle': { uz: 'Davomat nazorati', ru: 'Контроль посещаемости', en: 'Attendance monitor' },
  'dr.monitorDesc': { uz: "Agar ustoz davomat qilmasa, uning ilovasiga SMS xabar tushadi", ru: 'Если учитель не заполнит посещаемость, в его приложение придёт SMS', en: 'If a teacher does not submit attendance, an SMS goes to their app' },
  'dr.notSubmitted': { uz: 'Davomat qilmagan', ru: 'Не заполнил', en: 'Not submitted' },
  'dr.submitted': { uz: 'Davomat qilgan', ru: 'Заполнил', en: 'Submitted' },
  'dr.sendSms': { uz: 'SMS yuborish', ru: 'Отправить SMS', en: 'Send SMS' },
  'dr.smsSent': { uz: 'SMS yuborildi', ru: 'SMS отправлено', en: 'SMS sent' },
  'dr.smsText': { uz: 'Bu ustoz bu sinfning davomatini qilmadi', ru: 'Этот учитель не заполнил посещаемость этого класса', en: 'This teacher has not submitted attendance for this class' },
  'dr.smsLog': { uz: 'Yuborilgan SMS lar', ru: 'Отправленные SMS', en: 'Sent SMS log' },
  'dr.allTeachersChat': { uz: 'Barcha ustozlar chati', ru: 'Чат со всеми учителями', en: 'All teachers chat' },
  'dr.overview': { uz: 'Umumiy ko\'rinish', ru: 'Обзор', en: 'Overview' },
  'dr.teachersCount': { uz: 'Ustozlar soni', ru: 'Количество учителей', en: 'Teachers' },
  'dr.studentsCount': { uz: "O'quvchilar soni", ru: 'Количество учеников', en: 'Students' },
  'dr.coinsOut': { uz: 'Ustozlarga ajratilgan coin', ru: 'Выделено монет учителям', en: 'Coins allocated to teachers' },

  // sozlamalar
  'stt.title': { uz: 'Sozlamalar', ru: 'Настройки', en: 'Settings' },
  'stt.display': { uz: 'Ko\'rinish', ru: 'Оформление', en: 'Display' },
  'stt.light': { uz: 'Yorug\'', ru: 'Светлая', en: 'Light' },
  'stt.dark': { uz: 'Qorong\'i', ru: 'Тёмная', en: 'Dark' },
  'stt.language': { uz: 'Til', ru: 'Язык', en: 'Language' },
  'stt.profile': { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
  'stt.changeName': { uz: 'Ismni o\'zgartirish', ru: 'Изменить имя', en: 'Change display name' },
  'stt.changePassword': { uz: 'Parolni o\'zgartirish', ru: 'Изменить пароль', en: 'Change password' },
  'stt.faq': { uz: 'Ko\'p beriladigan savollar', ru: 'Частые вопросы', en: 'Frequently asked questions' },

  // FAQ
  'fq.q1': { uz: 'Coinlarni qanday yig\'aman?', ru: 'Как заработать монеты?', en: 'How do I earn coins?' },
  'fq.a1': { uz: "Ustozlaringiz vazifani vaqtida bajarganingizda, darsga faol qatnashganingizda yoki monitoringda yuqori natija ko'rsatingizda coin beradi.", ru: 'Учителя дают монеты за вовремя выполненное задание, активность на уроке или высокий результат мониторинга.', en: 'Teachers give coins for completed tasks on time, participation in class or high monitoring results.' },
  'fq.q2': { uz: 'Reyting qanday hisoblanadi?', ru: 'Как считается рейтинг?', en: 'How is the ranking calculated?' },
  'fq.a2': { uz: "Uch xil alohida reyting bor: coin bo'yicha, davomat bo'yicha va oylik monitoring bo'yicha. Har bir bo'limda alohida o'rin ko'rsatiladi.", ru: 'Есть три отдельных рейтинга: по монетам, по посещаемости и по месячному мониторингу. В каждом разделе показывается отдельное место.', en: 'There are three separate rankings: by coins, by attendance and by monthly monitoring. Each section shows its own place.' },
  'fq.q3': { uz: "Boshqa o'quvchining akkauntini ko'rsam bo'ladimi?", ru: 'Можно ли посмотреть аккаунт другого ученика?', en: "Can I view another student's account?" },
  'fq.a3': { uz: "Ha, reytingdan biror o'quvchini tanlab uning statistikasini ko'rishingiz mumkin — faqat statistika ko'rinadi, shaxsiy ma'lumotlar ko'rinmaydi.", ru: 'Да, выбрав ученика в рейтинге, можно посмотреть его статистику — видны только статистические данные, личная информация скрыта.', en: "Yes, pick a student in the rankings to see their statistics — only stats are visible, personal data stays hidden." },
  'fq.q4': { uz: 'Parolni qanday o\'zgartiraman?', ru: 'Как изменить пароль?', en: 'How do I change my password?' },
  'fq.a4': { uz: "Sozlamalar bo'limiga kiring, «Parolni o'zgartirish» ni tanlang va yangi parolni kiriting.", ru: 'Откройте «Настройки», выберите «Изменить пароль» и введите новый пароль.', en: 'Open Settings, choose “Change password” and enter your new password.' },
  'fq.q5': { uz: 'Tilni o\'zgartirsam bo\'ladimi?', ru: 'Можно ли изменить язык?', en: 'Can I change the language?' },
  'fq.a5': { uz: "Ha. Sozlamalar → Til bo'limidan o'zbek, rus va ingliz tillaridan birini tanlashingiz mumkin.", ru: 'Да. В «Настройки → Язык» можно выбрать узбекский, русский или английский.', en: 'Yes. In Settings → Language you can pick Uzbek, Russian or English.' },
  'fq.q6': { uz: 'Davomat nima uchun kerak?', ru: 'Зачем нужна посещаемость?', en: 'What is attendance for?' },
  'fq.a6': { uz: "Ustoz har darsda «keldi», «ketdi» yoki «kirmadi» deb belgilaydi. Direktor esa kim davomat qilmaganini kuzatib, eslatma SMS yuboradi.", ru: 'Учитель отмечает «пришёл», «ушёл» или «не пришёл» на каждом уроке. Директор отслеживает, кто не заполнил посещаемость, и отправляет напоминание.', en: "Teachers mark 'present', 'left' or 'absent' each lesson. The director tracks who has not submitted and sends a reminder SMS." },
  'fq.q7': { uz: 'Qorong\'i rejimni qanday yoqaman?', ru: 'Как включить тёмную тему?', en: 'How do I enable dark mode?' },
  'fq.a7': { uz: "Sozlamalar → Ko'rinish bo'limida «Yorug'» yoki «Qorong'i» ni tanlang.", ru: 'В «Настройки → Оформление» выберите «Светлая» или «Тёмная».', en: 'In Settings → Display choose “Light” or “Dark”.' },

  // kunlar
  'd.dushanba': { uz: 'Dushanba', ru: 'Понедельник', en: 'Monday' },
  'd.seshanba': { uz: 'Seshanba', ru: 'Вторник', en: 'Tuesday' },
  'd.chorshanba': { uz: 'Chorshanba', ru: 'Среда', en: 'Wednesday' },
  'd.payshanba': { uz: 'Payshanba', ru: 'Четверг', en: 'Thursday' },
  'd.juma': { uz: 'Juma', ru: 'Пятница', en: 'Friday' },
  'd.shanba': { uz: 'Shanba', ru: 'Суббота', en: 'Saturday' },
};

export const LANGS = [
  { id: 'uz', label: "O'zbekcha" },
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
];

// ============================================================
//  API yordamchisi
// ============================================================
export async function api(path, opts = {}, token) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-token': token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || 'Xato');
  return data;
}

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('im_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('im_user') || 'null');
    } catch (e) {
      return null;
    }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('im_theme') || 'light');
  const [lang, setLang] = useState(() => localStorage.getItem('im_lang') || 'uz');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('im_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('im_lang', lang);
  }, [lang]);

  const t = useCallback(
    (key) => {
      const e = T[key];
      if (!e) return key;
      return e[lang] || e.uz;
    },
    [lang]
  );

  const request = useCallback((path, opts) => api(path, opts, token), [token]);

  const login = useCallback(async (loginName, password) => {
    const data = await api('/login', { method: 'POST', body: { login: loginName, password } });
    localStorage.setItem('im_token', data.token);
    localStorage.setItem('im_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api('/register', { method: 'POST', body: payload });
    localStorage.setItem('im_token', data.token);
    localStorage.setItem('im_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('im_token');
    localStorage.removeItem('im_user');
    setToken('');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('im_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ token, user, theme, setTheme, lang, setLang, t, request, login, register, logout, updateUser }),
    [token, user, theme, lang, t, request, login, register, logout, updateUser]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
