// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:"./.env"
})

connectDb()
.then(()=>{
    app.on("error",(err)=>{
        console.log("MONGODB connection failed",err)
    })
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(`🎶 Server is running at PORT :: ${process.env.PORT}`)
    })
})
.catch((err) =>{
    console.log("MONGODB connection failed :: ",err)
})

















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