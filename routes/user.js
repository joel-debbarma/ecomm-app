const express =require("express");
const router= express.Router();

const {signup, login, logout, forgotPassword, 
    passwordReset, getLoggedInUserDetails, changePassword, 
    updateUserDetails, adminAllUser, managerAllUser, 
    admingetOneUser, adminUpdateOneUserDetails, adminDeleteOneUser} = require("../controllers/userController");
const { isLoggoedIn, customRole } = require("../middlewares/user");

router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.route('/forgotPassword').post(forgotPassword);
router.route('/password/reset/:token').post(passwordReset);
router.route('/userdashboard').get(isLoggoedIn,getLoggedInUserDetails);
router.route('/password/update').post(isLoggoedIn,changePassword);
router.route('/userdashboard/update').post(isLoggoedIn,updateUserDetails);

router.route('/admin/users').get(isLoggoedIn,customRole('admin'),adminAllUser);
router.route('/admin/users/:id').get(isLoggoedIn,customRole('admin'),admingetOneUser);
router.route('/admin/users/:id').put(isLoggoedIn,customRole('admin'),adminUpdateOneUserDetails);
router.route('/admin/users/:id').delete(isLoggoedIn,customRole('admin'),adminDeleteOneUser);



router.route('/manager/users').get(isLoggoedIn,customRole('manager'),managerAllUser);

module.exports = router;