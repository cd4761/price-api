# RESTful API for TON price

```
$ npm install
$ node app.js
```

### API List
| ROUTE                     | METHOD | DESCRIPTION               |
|---------------------------|--------|---------------------------|
| /btc/price                | GET    | 모든 btc pair price 데이터 조회        |
| /btc/price/latest         | GET    | 최신 btc pair price 데이터 조회        |
| /btc/price/:from/:to      | GET    | 기간 내 btc pair price 데이터 조회     |
| /krw/price                | GET    | 모든 krw pair price 데이터 조회        |
| /krw/price/latest         | GET    | 최신 krw pair price 데이터 조회        |
| /krw/price/:from/:to      | GET    | 기간 내 krw pair price 데이터 조회     |
| /circulatedcoins          | GET    | 유통되는 TON 갯수 확인        |
