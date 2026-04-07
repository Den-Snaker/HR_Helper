# HR Helper

Поиск резюме и вакансий на HH.ru с OAuth2 авторизацией.

## Возможности

- 🔍 Поиск вакансий (без авторизации)
- 👤 Поиск резюме соискателей (требуется авторизация работодателя)
- 📊 Экспорт результатов в Excel
- 🔄 OAuth2 авторизация через HH.ru
- 📱 Адаптивный интерфейс

## Установка

### Локальная разработка

```bash
npm install
npm run dev
```

Откройте http://localhost:5001

### Production деплой

1. Арендуйте VPS
2. Настройте DNS: A-запись `hr.ctpco.ru` → IP_VPS
3. Добавьте secrets в GitHub:
   - `VPS_HOST` - IP-адрес сервера
   - `VPS_USER` - пользователь SSH (обычно root)
   - `VPS_SSH_KEY` - приватный SSH ключ
   - `HH_CLIENT_ID` - Client ID от HH.ru
   - `HH_CLIENT_SECRET` - Client Secret от HH.ru
4. Push в ветку main автоматически задеплоит изменения

## OAuth2 Настройка

1. Приложение должно быть зарегистрировано на HH.ru
2. Redirect URI: `https://hr.ctpco.ru/auth/callback`
3. Для локальной разработки: `http://localhost:5001/auth/callback`

## API Endpoints

### Авторизация
- `GET /auth/login` - Начать OAuth2 авторизацию
- `GET /auth/callback` - Callback для HH.ru
- `GET /auth/status` - Проверка авторизации
- `GET /auth/logout` - Выход

### API
- `GET /api/vacancies` - Поиск вакансий
- `GET /api/resumes` - Поиск резюме (требует авторизации)
- `GET /api/dictionaries` - Справочники HH.ru
- `GET /api/dictionaries/areas` - Регионы
- `POST /api/export` - Экспорт в Excel

## Структура проекта

```
src/
├── config.js          # Конфигурация
├── server.js          # Express сервер
├── routes/
│   ├── auth.js        # OAuth2 routes
│   └── api.js         # API routes
├── services/
│   ├── hh-api.js      # HH.ru API client
│   └── token-manager.js # Управление токенами
└── utils/
    └── excel-export.js # Экспорт в Excel

public/
├── index.html         # Главная страница
├── css/styles.css     # Стили
└── js/app.js          # Клиентский JS
```

## Лицензия

MIT