const BigPromise= require('../middlewares/bigPromise')

exports.home = BigPromise(async(req, res,next) => {
    //const db= await something()
    res.status(200).json({
        success: true,
        greeting:" Hello from API",
    });
})

exports.homeDummy = (req, res) => {
    try {
        res.status(200).json({
            success: true,
            greeting:" Hello from API HomeDummy",
        }); 
    } catch (error) {
        console.log(error)
    }
    
}