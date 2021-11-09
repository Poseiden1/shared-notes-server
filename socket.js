const socket = require('socket.io')
const www = require('./bin/www')
const URL = require('url')
const colors = require('colors')
const util = require('util')
const Delta = require('./dist/Delta')
/**@type {socket.Server} */
const io = socket()
var rooms = []
/**@type {[Delta]} */
var quills = []

const getRoomCount = (id) => {
  if (io.sockets.adapter.rooms.get(id))
    return io.sockets.adapter.rooms.get(id).size
  else return 0
}

var s1 // Host to receive document data
io.on('connection', (socket) => {
  socket.on('userConnect', (nickname) => {
    var u = URL.parse(socket.handshake.headers.referer)
    var roomId = u.path.split('/')[2]
    if (roomId.length !== 8) return
    if (!rooms.find((r) => r.id == roomId)) {
      socket.emit('room-not-found')
    }
    socket.join(roomId)
    socket.nickname = nickname
    console.log(nickname)
    var sIds = Array.from(io.sockets.adapter.rooms.get(roomId).values())
    var list = []
    sIds.map((sId) => {
      var user = {
        id: sId,
        nickname: io.sockets.sockets.get(sId).nickname,
      }
      list.push(user)
    })
    list.sort((a, b) =>
      a.nickname.toLowerCase() > b.nickname.toLowerCase()
        ? 1
        : b.nickname.toLowerCase() > a.nickname.toLowerCase()
        ? -1
        : 0
    )

    io.in(roomId).emit('joinedRoom', list)
    socket.emit('selfJoinedRoom')
    console.log(socket.id.bgYellow + ' joined ' + roomId.bgGreen)
  })

  socket.on('send-changes', (delta, name, id) => {
    var roomId = Array.from(socket.rooms)[1]
    console.log(
      util.inspect(delta, { showHidden: false, depth: null, colors: true })
    )
    const newDelta = quills[id].compose(delta)
    quills[id] = newDelta

    socket.to(roomId).emit('receive-changes-' + id, delta, name, id)
  })

  socket.on('get-document-field', (id) => {
    console.log('doc-field ID: ' + id)
    console.log('Listen:'.bgMagenta + ' ' + 'get-document-field'.bgCyan)
    s1 = socket
    var roomId = Array.from(socket.rooms)[1]
    var room = rooms.filter((r) => {
      return r.id === roomId
    })
    s2Id = io.sockets.adapter.rooms.get(roomId).values().next().value
    s2 = io.sockets.sockets.get(s2Id)
    if (s1.id == id) {
      quills[id] = new Delta()
      var delta = {
        ops: [
          {
            insert: socket.nickname,
          },
          { attributes: { header: 2 }, insert: '\n' },
        ],
      }
      var newDelta = quills[id].compose(delta)
      quills[id] = newDelta
      io.in(roomId).emit(
        'receive-changes-' + socket.id,
        delta,
        socket.nickname,
        socket.id
      )
    }
    if (s2.id != socket.id) {
      s1.emit('load-document-field-' + id, quills[id], id)
    } else {
      if(rooms.length < 1) return
      s2.emit('load-document-field-' + id, null, id)
      if (id == 'title') {
        quills[id] = new Delta()
        let ts = Date.now()
        let date_ob = new Date(ts)
        let date = date_ob.getDate()
        let month = date_ob.getMonth() + 1
        let year = date_ob.getFullYear()
        var delta = {
          ops: [
            {
              insert: room[0].name + ' ' + year + '-' + month + '-' + date,
            },
            { attributes: { header: 1 }, insert: '\n' },
          ],
        }
        var newDelta = quills[id].compose(delta)
        quills[id] = newDelta

        s2.emit('receive-changes-title', delta, s2.nickname, 'title')
      }
      if (id == socket.id) {
        socket.emit(
          'receive-changes-' + socket.id,
          {
            ops: [
              {
                insert: socket.nickname,
              },
              { attributes: { header: 2 }, insert: '\n' },
            ],
          },
          socket.nickname,
          socket.id
        )
      }
    }
  })

  socket.on('load-document-field', (data, id) => {
    s1.emit('load-document-field-' + id, data, id)
  })

  socket.on('save-document-field', (data, id) => {
    let roomId = Array.from(socket.rooms)[1]
    console.log("save-document-field" + roomId)
    io.to(roomId).emit('load-document-field-' + id, data, id)
  })

  socket.on('disconnecting', () => {
    let roomId = Array.from(socket.rooms)[1]
    if (roomId === undefined) return
    console.log(socket.id.bgYellow + ' left ' + roomId.bgGreen)
    socket.leave(roomId)
    if (io.sockets.adapter.rooms.get(roomId) == undefined) {
      console.log('Room destroied')
      for (var i = 0; i < rooms.length; i++) {
        var room = rooms[i]
        if (room.id === roomId) {
          rooms.splice(i, 1)
          console.log('Room destroied 2')
          i--
        }
      }
      return
    }
    var sIds = Array.from(io.sockets.adapter.rooms.get(roomId).values())
    var list = []
    sIds.map((sId) => {
      var user = {
        id: sId,
        nickname: io.sockets.sockets.get(sId).nickname,
      }
      list.push(user)
    })
    list.sort((a, b) =>
      a.nickname.toLowerCase() > b.nickname.toLowerCase()
        ? 1
        : b.nickname.toLowerCase() > a.nickname.toLowerCase()
        ? -1
        : 0
    )

    io.in(roomId).emit('joinedRoom', list)
  })

  socket.on('disconnect', (reason) => {
    console.log(socket.id.bgYellow + ' disconnected!')
    console.log(reason)
  })
})

module.exports = {
  getRoomCount: getRoomCount,
  rooms: rooms,
  quills: quills,
  io: io,
}
