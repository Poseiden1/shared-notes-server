var express = require('express')
var router = express.Router()
var crypto = require('crypto')
const { getRoomCount, rooms } = require('../socket')


const generateCode = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(4, (err, res) => {
      var id = res.toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
      resolve(id)
    })
  })
}

/* GET users listing. */
router.get('/', function (req, res, next) {
  var data = []
  rooms.forEach((room) => {
    var r = {
      id: room.id,
      name: room.name,
      users: getRoomCount(room.id),
      password: room.password.length > 0 ? 'Yes' : 'No',
      owner: room.owner,
    }
    data.push(r)
  })
  console.log(data)
  res.json(data)
})

router.post('/create', (req, res) => {
  var formData = req.body
  generateCode().then((id) => {
    formData.id = id
    rooms.push(formData)
    return res.status(200).json({
      success: true,
      redirectUrl: `/rooms/${formData.id}`,
    })
  })
})

router.post('/join', (req, res) => {
  var formData = req.body
  var room = rooms.find(r => r.id == formData.roomId)

  if (room !== undefined) {
    if (room.password === formData.password) {
      return res.status(200).json({
        success: true,
        redirectUrl: `/rooms/${formData.roomId}`,
      })
    } else {
      return res.status(200).json({
        success: false,
        reason: 'Wrong password!',
      })
    }
  } else {
    return res.status(200).json({
      success: false,
      reason: `no room found with id: ${formData.roomId}`,
    })
  }
})

module.exports = router
