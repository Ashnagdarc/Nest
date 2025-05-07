"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
// Set your admin credentials here
var adminEmail = 'admin@yourdomain.com';
var adminPassword = 'AdminPassword123!';
var adminFullName = 'Admin User';
// Initialize Supabase client
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
function seedAdmin() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, signUpData, signUpError, userId, _b, userData, userFetchError, error_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, supabase.auth.signUp({
                            email: adminEmail,
                            password: adminPassword,
                            options: {
                                emailRedirectTo: '', // No redirect needed for seeding
                            },
                        })];
                case 1:
                    _a = _d.sent(), signUpData = _a.data, signUpError = _a.error;
                    if (signUpError && !signUpError.message.includes('User already registered')) {
                        throw signUpError;
                    }
                    userId = (_c = signUpData === null || signUpData === void 0 ? void 0 : signUpData.user) === null || _c === void 0 ? void 0 : _c.id;
                    if (!!userId) return [3 /*break*/, 4];
                    return [4 /*yield*/, supabase
                            .from('profiles')
                            .select('id')
                            .eq('email', adminEmail)
                            .maybeSingle()];
                case 2:
                    _b = _d.sent(), userData = _b.data, userFetchError = _b.error;
                    if (userFetchError || !userData) {
                        throw userFetchError || new Error('Could not fetch existing admin user ID');
                    }
                    // Use the existing user ID
                    return [4 /*yield*/, insertProfile(userData.id)];
                case 3:
                    // Use the existing user ID
                    _d.sent();
                    return [3 /*break*/, 6];
                case 4: 
                // 2. Insert the profile for the new user
                return [4 /*yield*/, insertProfile(userId)];
                case 5:
                    // 2. Insert the profile for the new user
                    _d.sent();
                    _d.label = 6;
                case 6:
                    console.log('Admin user and profile seeded successfully.');
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _d.sent();
                    console.error('Error seeding admin:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function insertProfile(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var profileError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase.from('profiles').upsert({
                        id: userId,
                        email: adminEmail,
                        full_name: adminFullName,
                        role: 'Admin',
                        status: 'Active',
                    })];
                case 1:
                    profileError = (_a.sent()).error;
                    if (profileError)
                        throw profileError;
                    return [2 /*return*/];
            }
        });
    });
}
seedAdmin();
