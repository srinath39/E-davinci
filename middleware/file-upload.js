const multer=require("multer");
const uuid=require("uuid");

const MIME_TYPE_MAP={
    "image/jpg":"jpg",
    "image/png":"png",
    "image/jpeg":"jpeg"
}

const fileUpload= multer({
    limits:500000,
    storage:multer.diskStorage({
        destination:(req,file,cb)=>{
            cb(null,"uploads/images");
        },
        filename:(req,file,cb)=>{
            const ext=MIME_TYPE_MAP[file.mimetype];
            cb(null,uuid.v1()+"."+ext);
        }
    }),
    fileFilter:(req, file, cb)=>{
        const isValid= !!MIME_TYPE_MAP[file.mimetype];   // the !! for undefined and null ,It will return false
        let error= isValid ? null: new Error("Invalid mime Type");
        cb(error,isValid);
    }
});

module.exports= fileUpload;