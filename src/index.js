// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import connectDb from "./db/index.js";

dotenv.config({
    path:"./env"
})
connectDb()


















/*
import express from "express";
const app = express()

( async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("Error :: ",error)
            throw error
        })
        
        app.listen(process.env.PORT || 8000,()=>console.log(`App is running on port :: ${process.env.PORT}`))
    } catch (error) {
        console.log("Error :: ",error);
        throw error
    }
})()
    */