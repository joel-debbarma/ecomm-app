const User = require('../models/user');
const BigPromise = require("../middlewares/bigPromise");
const CustomError =require("../utils/customError");
const cookieToken = require('../utils/cookieToken');
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary");
const mailHelper = require('../utils/emailHelper');
const crypto = require("crypto");

exports.signup = BigPromise(async (req, res, next)=>{
    // 
    //let result;
    // if(!req.files){
    //     return next(new CustomError("Photo is required for signup", 400));
    // }

    const {name, email, password,role}= req.body;

    if(!email ||!name ||!password){
        return next(new CustomError("Name, email and password are required", 400));
    }

    //     let file = req.files.photo
    //    let result=await cloudinary.v2.uploader.upload(file.tempFilePath,{
    //         folder:"users",
    //         width:150,
    //         crop:"scale"
    //     })

    const user = await User.create({
        name,
        email,
        password,
        role,
        // photo:{
        //     id:result.public_id,
        //     secure_url:result.secure_url
        // }
    }).then((user)=>{
        console.log('+++++data='+user);
        
        cookieToken(user,res);
    }).catch(err=>{
        console.log("++++++error"+err)
        return next(res.json({errorMessage:"Error"}))
    })
    

   //cookieToken(user,res);

});

exports.login = BigPromise(async (req,res, next)=>{
    const {email, password} =req.body;

    // check for email and password

    if(!email || !password){
        return next(new CustomError("Please enter the correct email and password",400));
    }
    
    //get user from db
    const user = await User.findOne({email}).select("+password");

    //if user not found in db
    if(!user){
        // return next(new CustomError("Email or Password does not match or exist",400));
        return next(res.status(400).json({message:"Email or Password does not match or exist"}));

    }

    //match the password
    const isPasswordCorrect= await user.isValidatedPassword(password);

    //if password donot match
    if(!isPasswordCorrect){
        return next(new CustomError("Email or Password does not match or exist-P",400));
    }

    //if all goes well we send the token
    cookieToken(user, res);
    
})

exports.logout = BigPromise(async (req,res, next)=>{
    res.cookie('token',null,{
        expires:new Date(Date.now()),
        httpOnly:true
    })
    res.status(200).json({
        success:true,
        message:"Logout success"
    })
})

exports.forgotPassword = BigPromise(async (req,res, next)=>{
    const{email}=req.body;

    const user = await User.findOne({email});
    
    if(!user){
        return next(new CustomError("Email not found as registered", 400));
    }

    const forgotToken= user.getForgotPasswordToken();

    await user.save({validateBeforeSave:false});

    const myUrl=`${req.protocol}://${req.get("host")}/password/reset/${forgotToken}`;

    const message = `Copy paste this link in your URL and hit enter \n\n ${myUrl}`;

    try{
        await mailHelper({
            email:user.email,
            subject:"Password reset Email",
            message

        })
        res.status(200).json({
            success:true,
            message: "Email sent successfully"
        })

    }catch(error){
        user.forgotPasswordToken=undefined;
        user.forgotPasswordExpiry=undefined;
        await user.save({validateBeforeSave:false});

        return next(new CustomError(error.message,500));
    }
})

exports.passwordReset = BigPromise(async (req,res, next)=>{
    const token=req.params.token;
    const encryToken=crypto.createHash('sha256').update(token).digest('hex');

    // console.log(encryToken);

    const user = await User.findOne({
        forgotPasswordToken:encryToken, 
        forgotPasswordExpiry:{$gt: Date.now()}
    });

    // console.log(user);
    if(!user){
        return next(new CustomError("Token is invalid or expired", 400));
    }

    if(req.body.password!== req.body.confirmPassword){
        return next(new CustomError("Passward and conform password donot meatch", 400));
    }

    user.password=req.body.password;

    user.forgotPasswordExpiry=undefined;
    user.forgotPasswordToken=undefined;
    await user.save();
    // Send a JSON response or send token
    cookieToken(user, res);
});

exports.getLoggedInUserDetails = BigPromise(async (req,res, next)=>{
    //req.user will be added by middleware
   //find user by id
    const user= await User.findById(req.user.id);
     //send response and user data
    res.status(200).json({
        success:true,
        user,
    });

});

exports.changePassword = BigPromise(async (req,res, next)=>{
   const userId= req.user.id;

   const user= await User.findById(userId).select("password");

   const isCorrectOldPassword= await user.isValidatedPassword(req.body.oldPassword);
   if(!isCorrectOldPassword){
    return next(new CustomError("Old Password is not correct", 400));
   }

   user.password=req.body.password;

   await user.save();

   cookieToken(user, res);

});

exports.updateUserDetails = BigPromise(async (req,res, next)=>{
   
    const newData ={
        name: req.body.name,
        email:req.body.email,

    };
    //delete photo on cloudinary
    if(req.files){
        const user = await User.findById(req.user.id);
        const imageId= user.photo.id;
        const resp = await cloudinary.v2.uploader.destroy(imageId);
   
    //update photo on cloudinary
    let result=await cloudinary.v2.uploader.upload(req.files.photo.tempFilePath,{
        folder:"users",
        width:150,
        crop:"scale"
    })
    newData.photo={
        id:result.public_id,
        secure_url:result.secure_url
    }

    } 
    const user = await User.findByIdAndUpdate(req.user.id, newData, {
        new:true,
        runValidators:true,
        useFindAndModify:false
    });

    res.status(200).json({
        success:true,
        user
    })
 
 });

exports.adminAllUser = BigPromise(async (req,res, next)=>{
   
    const users = await User.find();
 
    res.status(200).json({
        success:true,
        users
    });
});
exports.admingetOneUser = BigPromise(async (req,res, next)=>{
   const user = await User.findById(req.params.id);

   if(!user){
    next(new CustomError("No user found",400));
   }

   res.status(200).json({
    success:true,
    user
   });
});

exports.adminUpdateOneUserDetails = BigPromise(async (req,res, next)=>{
    
   
    const newData ={
        name: req.body.name,
        email:req.body.email,
        role:req.body.role
    };
    //delete photo on cloudinary
    if(req.files){
        const user = await User.findById(req.user.id);
        const imageId= user.photo.id;
        const resp = await cloudinary.v2.uploader.destroy(imageId);
   
    //update photo on cloudinary
    // let result=await cloudinary.v2.uploader.upload(req.files.photo.tempFilePath,{
    //     folder:"users",
    //     width:150,
    //     crop:"scale"
    // })
    // newData.photo={
    //     id:result.public_id,
    //     secure_url:result.secure_url
    // }

    } 
    const user = await User.findByIdAndUpdate(req.params.id, newData, {
        new:true,
        runValidators:true,
        useFindAndModify:false
    });

    res.status(200).json({
        success:true,
        user
    })
 
 });

 exports.adminDeleteOneUser = BigPromise(async (req,res, next)=>{
   
    const user = await User.findById(req.params.id);

    if(!user){
        return next(new CustomError("No such user found",401));
    }

    const imageId= user.photo.id;

    await cloudinary.v2.uploader.destroy(imageId);

    await user.deleteOne();

    res.status(200).json({
        success:true
    });
    
 });

exports.managerAllUser = BigPromise(async (req,res, next)=>{
   
    const users = await User.find({role:'user'});
 
    res.status(200).json({
        success:true,
        users
    });
});

