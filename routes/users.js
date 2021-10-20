var express = require('express')
var router = express.Router()

/* GET users listing. */
router.get('/', function (req, res, next) {
  // Kommentiere diese Zeile aus
  //res.send('respond with a resource');

  // Und füge soetwas ein
  res.json([
    {
      id: 1,
      username: 'samsepi0l',
    },
    {
      id: 2,
      username: 'D0loresH4ze',
    },
  ])
})

module.exports = router
