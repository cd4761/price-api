# RESTful API for TON price

```
$ npm install
$ node app.js
```

### API List
| ROUTE                     | METHOD | DESCRIPTION               |
|---------------------------|--------|---------------------------|
| /price                | GET    | 모든 price 데이터 조회        |
| /price/latest               | GET    | 최신 price 데이터 조회        |
| /price/:from/:to               | GET    | 기간 내 price 데이터 조회        |
| /circulatedcoins               | GET    | 유통되는 TON 갯수 확인        |
