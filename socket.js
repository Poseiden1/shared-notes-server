const socket = require('socket.io')
const www = require('./bin/www')
const URL = require('url')
const colors = require('colors')
const util = require('util')
/**@type {socket.Server} */
const io = socket()
var rooms = [
  {
    id: 1,
    name: 'samsepi0l',
    password: 'test',
    owner: 'Raman',
  },
  {
    id: 2,
    name: 'ejkel',
    password: '',
    owner: 'Raman',
  },
]

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
    if(!rooms.find(r => r.id == roomId)) {
      socket.emit('room-not-found')
    }
    socket.join(roomId)
    socket.nickname = nickname
    console.log(nickname)
    var sIds = Array.from(io.sockets.adapter.rooms.get(roomId).values())
    io.in(roomId).emit('joinedRoom', sIds)
    socket.emit('selfJoinedRoom')
    console.log(socket.id.bgYellow + ' joined ' + roomId.bgGreen)
  })

  socket.on('send-changes', (delta, name, id) => {
    console.log(
      util.inspect(delta, { showHidden: false, depth: null, colors: true })
    )
    socket
      .to(Array.from(socket.rooms)[1])
      .emit('receive-changes', delta, name, id)
  })

  socket.on('get-document-field', (id) => {
    console.log('doc-field ID: ' + id)
    console.log('Listen:'.bgMagenta + ' ' + 'get-document-field'.bgCyan)
    s1 = socket
    var roomId = Array.from(socket.rooms)[1]

    s2Id = io.sockets.adapter.rooms.get(roomId).values().next().value
    s2 = io.sockets.sockets.get(s2Id)
    if (s1.id == id) {
      io.in(roomId).emit(
        'receive-changes',
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
    if (s2.id != socket.id) {
      console.log('compare: ' + s2.id)
      s2.emit('get-document-field', id)
    } else {
      s2.emit('load-document-field', id)
      if (id == 'title') {
        let ts = Date.now()

        let date_ob = new Date(ts)
        let date = date_ob.getDate()
        let month = date_ob.getMonth() + 1
        let year = date_ob.getFullYear()
        s2.emit(
          'receive-changes',
          {
            ops: [
              {
                insert:
                  'Shared Notes (Alpha) ' + year + '-' + month + '-' + date,
              },
              { attributes: { header: 1 }, insert: '\n' },
            ],
          },
          s2.nickname,
          'title'
        )
      }
    }
  })

  socket.on('load-document-field', (data, id) => {
    s1.emit('load-document-field', data, id)
  })

  socket.on('disconnecting', () => {
    let roomId = Array.from(socket.rooms)[1]
    if(roomId === undefined) return
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
    io.in(roomId).emit('joinedRoom', sIds)
  })

  socket.on('disconnect', () => {
    console.log(socket.id.bgYellow + ' disconnected!')
  })
})

module.exports = {
  getRoomCount: getRoomCount,
  rooms: rooms,
  io: io,
}
