const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage,generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUserInRoom } = require('./utils/users')

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname,'../public');

app.use(express.static(publicDirectoryPath));

//let count = 0;

io.on('connection', (socket) =>{        //connection is a built-in event
    console.log('New WebScoket Connection');

    socket.on('join', ({ username, room }, callback) =>{
        const { error, user } = addUser({ id: socket.id, username, room });
    
    //we can also use the below rest feature

    //socket.on('join', (options, callback) =>{
        //const { error, user } = addUser({ id: socket.id, ...options });
        
        if(error){
            return callback(error);
        }

        socket.join(user.room);

        socket.emit('message', generateMessage('Admin','Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined.`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        });
        callback();
    });

    socket.on('sendMessage', (message, callback) =>{
        const user = getUser(socket.id);
        const filter = new Filter();

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed');
        }

        io.to(user.room).emit('message', generateMessage(user.username,message));
        callback();
    });

    socket.on('sendLocation', (loc, callback) =>{
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${loc.latitude},${loc.longitude}`));
        callback();
    });

    socket.on('disconnect', () =>{       //disconnect is a built-in event
        const user = removeUser(socket.id);

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left`));
            io.to(user.room).emit('roomdata', {
                room: user.room,
                users: getUserInRoom(user.room)
            });
        }
    });
});

server.listen(port, () =>{
    console.log(`Server is running on port ${port}`);
});


//socket.emit:              This will work only for current user
//io.emit:                  This will work for all running users
//socket.broadcast.emit:    This will work for everyone expect the current user
//io.to.emit:               This will send message to everyone in a particular room
//socket.broadcast.to.emit: This will send message to everyone in a particular room except the sender