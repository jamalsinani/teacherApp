//imports
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo')(session);
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const puppeteer = require('puppeteer');
const uid = require('uid');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path =  require('path');
const sendMail = require('./mail');

//models 
const User = require('./models/user');
const UserClass = require('./models/class');
const Column = require('./models/column');

//main app entry
const app = express();

const PORT = process.env.PORT || 3000;
const DEV_DB_URI = "mongodb://localhost:27017/teacherApp";
const DB_URI = 'mongodb://admin:admin211@ds235078.mlab.com:35078/teacherapp';
//database connection
mongoose.connect(DEV_DB_URI, { useNewUrlParser: true });
// save the session in the DB
app.use(session({
    secret: 'ldodd*$&@)$#)TFJJIKhg',
    store: new MongoStore({ url: DEV_DB_URI }),
    resave: true,
    saveUninitialized: true,
}));

//mailer setup
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
           user: 'sejlaty.app@gmail.com',
           pass: 'pass@211'
       }
   });

//app setup

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public/'));
app.use(express.static(path.join(__dirname, 'images')));

// Data Parsing
app.use(express.urlencoded({
    extended: false
}));
app.use(express.json());

//passport setup
app.use(session({
    secret: 'unbreak33baleSecrektPass',
    resave: true,
    saveUninitialized: true,
})); // session secret

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


passport.use('local-login', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true // allows us to pass back the entire request to the callback
},
    async function (req, username, password, done) {

        const user = await User.findOne({ username })

        if (!user) {
            req.flash('message', 'أسم المستخدم غير موجود');
            return done(null, false);
        }

        if (!bcrypt.compareSync(password, user.password)) {
            req.flash('message', 'كلمة السر غير صحيحة');
            return done(null, false);
        }

        return done(null, user);

    }));


passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

//login middleware
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    req.flash('message', 'يجب عليك تسجيل الدخول أولاً')
    res.redirect('/login');
}

app.get('/login', (req, res) => {

    try {
        if (req.isAuthenticated()) {
            return res.redirect('/')
        }
    
        res.render('login', { message: req.flash('message'), success: req.flash('success') })
    } catch (error) {
        console.log(error);
    }
})


app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
}));

app.get('/signup', (req, res) => {
    res.render('signup', { message: req.flash('message') });
})

app.post('/signup', async (req, res) => {

    try {
        const exsistedUser = await User.findOne({ username: req.body.username });
    if (exsistedUser) {
        req.flash('message', 'أسم المستخدم موجود مسبقاً');
        return res.redirect("/signup");
    }

    req.body.password = bcrypt.hashSync(req.body.password, 10);

    const user = await User.create(req.body);
    if (user) {
        req.flash('success', 'تم التسجيل بنجاح')
        return res.redirect("/login");
    }
    } catch (error) {
        console.log(error);
    }
})

app.get('/logout', isLoggedIn, (req, res) => {
    req.logOut();
    return res.redirect("/login");
});

app.get('/', async (req, res) => {
    if( req.user === undefined) {
        res.render('index', { user: (req.isAuthenticated() ? req.user : false) });
    } else {
        const user = await User.findById(req.user._id);
        res.render('index', { user: (req.isAuthenticated() ? req.user : false), image: user.image, username: user.username });
    }
});

app.get('/succsse', async (req, res) => {
    res.render('succsse');
})

app.get('/callUs', async (req, res) => {
    if( req.user === undefined) {
        res.render('call_us', { 
            user: (req.isAuthenticated() ? req.user : false),
            msgsend: req.flash('sended')[0], 
            msgerr: req.flash('err')[0]
        });
    } else {
        const user = await User.findById(req.user._id);
        
        res.render('call_us', { 
            user: (req.isAuthenticated() ? req.user : false),
            image: user.image,
            msgsend: req.flash('sended')[0],
            msgerr: req.flash('err')[0],
            username: user.username
        });
    }
    
});

app.post('/callUs', async (req, res) => {
    const { email, subject, text } = req.body;
    await sendMail(email, subject, text, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Send Message');
        }
    });
    req.flash('sended', true);
    res.redirect('/callUs');
})

app.get('/classes', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    let classes = await UserClass.find({ userId: req.user._id })
    res.render('classes', { user: req.user, classes ,updated:req.flash('updated'), image: user.image, username: user.username});
})

app.post('/addclass', isLoggedIn, async (req, res) => {

    let newClass = UserClass({
        name: req.body.name,
        userId: req.user._id,
        subject: req.body.subject
    })

    await newClass.save();

    res.redirect('/classes')
})


app.get('/class/:id', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    let userClass = await UserClass.findById(req.params.id);

    if (userClass.userId != req.user._id) {
        res.send('access denied')
    }

    res.render('class', { user: req.user, userClass, updated: req.flash('updated'), image: user.image, username: user.username })
})

app.get('/managecolumns/:id', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    let columns = await Column.find({ classId: req.params.id });

    let userClass = await UserClass.findById(req.params.id);

    res.render('manage_columns', { columns, user: req.user, userClass, updated: req.flash('updated'), image: user.image, username: user.username });
})

app.get('/addcolumn/:id', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    let columns = await Column.find({ classId: req.params.id });

    res.render('add_column', { user: req.user, classId: req.params.id, columns, image: user.image, username: user.username })
})

app.post('/addcolumn/', async (req, res) => {

    let data = req.body;

    data.name = data.name.trim()

    if (await Column.findOne({ name: data.name, classId: req.body.classId })) {
        return res.send('error')
    }

    let columns = await Column.find({ classId: req.body.classId })

    if (columns.length >= 15) {
        return res.send('limit')
    }

    let column = Column(data);

    await column.save();


    newColumn = {
        type: column.type,
        value: 0,
        short: column.short,
        inputColumns: column.inputColumns
    }

    let userClass = await UserClass.findById(req.body.classId)

    let students = userClass.students;

    let newStudents = students.map((item)=>{
        item.booklet[column.name] = newColumn;

        return item
    })

    await UserClass.findByIdAndUpdate(req.body.classId,{students:newStudents})


    req.flash('updated', 'updated')
    res.send('done')
})


app.get('/editcolumn/:classId/:id', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    let column = await Column.findById(req.params.id);
    let columns = await Column.find({classId:req.params.classId})

    res.render('edit_column', { user: req.user, column, columns, image: user.image, username: user.username })
})

app.post('/editcolumn/:id', async (req, res) => {

    await Column.findByIdAndUpdate(req.params.id, {
        type: req.body.type,
        short: req.body.short,
        desc: req.body.desc,
        inputColumns: req.body.inputColumns,
        value:req.body.value
    })

    req.flash('updated', 'updated')
    res.send('done')
})

app.get('/deletecolumn/:classId/:id', isLoggedIn, async (req, res) => {
    
    let column = await Column.findById(req.params.id)

    await Column.findByIdAndDelete(req.params.id)

    let userClass = await UserClass.findById(req.params.classId)

    let students = userClass.students;

    let newStudents = students.map((item)=>{
        delete item.booklet[column.name]

        return item
    })

    await UserClass.findByIdAndUpdate(req.params.classId,{students:newStudents})


    req.flash('updated', 'updated')

    res.redirect('back')
})

app.get('/addstudents/:id', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('add_students', { user: req.user, classId: req.params.id, image: user.image, username: user.username })
})

app.post('/addstudents/:id', isLoggedIn, async (req, res) => {

    let columns = await Column.find({ classId: req.params.id })

    columnSchemas = {}

    columns.forEach((item) => {

        columnSchemas[item.name] = {
            type: item.type,
            value: 0,
            short: item.short,
            inputColumns: item.inputColumns
        }
    })

    let data = req.body.students

    let studentsArray = []

    data.trim().split('\n').forEach((item) => {
        studentsArray.push({
            id: studentsArray.length,
            name: item.trim(),
            booklet: {
                ...columnSchemas
            }
        })
    })

    let userClass = await UserClass.findById(req.params.id)

    await UserClass.findByIdAndUpdate(req.params.id, { students: [...userClass.students,...studentsArray] })

    req.flash('updated', 'updated')

    res.redirect('/class/' + req.params.id)


})

app.get('/editstudent/:classId/:id', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    let userClass = await UserClass.findById(req.params.classId)

    if (userClass.userId != req.user._id) {
        return res.redirect('back')
    }

    let student = userClass.students[req.params.id];

    if (!student) {
        return res.send('not found')
    }

    res.render('edit_student', { user: req.user, student, classId: userClass._id, image: user.image, username: user.username })
})

// Save All Data
app.post('/class/:id', async (req, res) => {
    try {
        // Get Form Data
        let data = req.body;
        let booklet = {};
        Object.keys(data).forEach((item) => {
            if (item != 'name') {
                // Item = Coulm Name
                booklet[item] = data[item]
            }
        })
        
        // Get All Data
        let userClass = await UserClass.findById(req.params.id);
        // Get Students
        let students = userClass.students;
        // Get Col Of Grades
        const gradeKey = Object.keys(students[0].booklet);
        // Loop Og All Students
        students.forEach((grade, index) => {
            Object.keys(booklet).forEach((item) => {
                gradeKey.forEach(el => {
                    // Check Col = Item
                    if(item == el) {
                        booklet[item].forEach((val, i) => {
                            if( index === i) {
                                grade.booklet[item].value = val;
                            }
                        })    
                    }    
                });
            })
        });
        await UserClass.findByIdAndUpdate({_id: req.params.id}, { students })
        req.flash('updated', 'updated')
    
        res.redirect('/class/' + req.params.id);
    } catch (error) {
        console.log(error);
    }
});

app.post('/editstudent/:classId/:id', isLoggedIn, async (req, res) => {

    let data = req.body;
    let booklet = {};

    Object.keys(data).forEach((item) => {

        if (item != 'name') {
            booklet[item] = data[item]
        }
    })

    let userClass = await UserClass.findById(req.params.classId)

    let students = userClass.students

    students[req.params.id].name = data.name

    Object.keys(booklet).forEach((item) => {

        students[req.params.id].booklet[item].value = booklet[item]
    })

    await UserClass.findByIdAndUpdate(req.params.classId, { students })

    req.flash('updated', 'updated')

    res.redirect('/class/' + req.params.classId)
})

app.get('/deletestudent/:classId/:id', async (req, res) => {

    let userClass = await UserClass.findById(req.params.classId);

    let students = userClass.students

    students.splice(req.params.id, 1);

    await UserClass.findByIdAndUpdate(req.params.classId, { students })

    req.flash('updated', 'updated')

    res.redirect('/class/' + userClass._id)
})

app.get('/deleteclass/:id',async(req,res)=>{

    await UserClass.findByIdAndDelete(req.params.id)

    req.flash('updated','updated')

    res.redirect('/classes')
})

app.get('/viewstudents/:id',isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);

    let userClass = await UserClass.findById(req.params.id);

    if (userClass.userId != req.user._id) {
        res.send('access denied')
    }

    res.render('view_students', { user: req.user, userClass,sent:req.flash('sent'),error:req.flash('error'), image: user.image, username: user.username })
})

app.get('/editteacher',isLoggedIn,async(req,res)=>{
    const user = await User.findById(req.user._id);

    res.render('edit_teacher',{user:req.user,updated:req.flash('updated'), image: user.image, username: user.username})
})

app.post('/editteacher',isLoggedIn,multer({
    storage: multer.diskStorage({
    //  Propartiy to location upload
    destination: (req, file, cb) => {
        // Name Location upload Images
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        // To Show Picture in Files Images It is not encrypted or duplicated
        cb(null, Date.now() + '-' + file.originalname)
    }
    })
}).single('image') ,async(req,res)=>{
    req.body.image = req.file.filename;
    await User.findByIdAndUpdate(req.user._id,{...req.body})

    req.flash('updated','updated')

    res.redirect('back')
})

app.post('/sendpdf',async(req,res)=>{

    
    let userClass = await UserClass.findById(req.body.classId)

    filename = `${userClass.name}-${userClass.subject}-${uid(3)}.pdf`.split('/').join('-')

    let filePath =  'tmp/' + filename

    let url = 'http://localhost:3000/viewstudents/' + userClass._id

    await printPDF(url,filePath,req.get('Cookie'))

    const mailOptions = {
        from: 'sejlaty.app@gmail.com', // sender address
        to: req.body.email, // list of receivers
        subject: `نتيجة الفصل: ${userClass.name} - المادة: ${userClass.subject}`, // Subject line
        html: `<h4 style="font-size:24px;color:black">لتحميل سجل درجات الفصل ${userClass.name} يرجاء الضغط <a href="http://sejlaty.com/getresult/${filePath}">هنا</a></h4>`// plain text body
      };

      transporter.sendMail(mailOptions, function (err, info) {
        if(err){
          console.log(err)
          req.flash('error','error')
          res.redirect('back')
        }else{
            req.flash('sent','sent')
            res.redirect('back')
        }
          
     });

     

})

app.get('/getresult/tmp/:filename',(req,res)=>{
    res.sendFile(__dirname + `/tmp/${req.params.filename}`)
})

async function printPDF(url,path,cookie) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setCookie({
        name:cookie.split('=')[0],
        value:cookie.split('=')[1],
        url
    })
    await page.goto(url, {waitUntil: 'networkidle0'});

    const pdf = await page.pdf({ format: 'A4',path });
   
    await page.goto('about:blank')
    await page.close();
    await browser.close();

  }

app.listen(PORT, () => console.log(`running on port ${PORT}`));