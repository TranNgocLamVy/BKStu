import { createContext, useContext, useState, useLayoutEffect } from "react";
import { auth, secondary_auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import {
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    NextOrObserver,
    User,
    UserCredential,
} from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";

//AuthProvider using useContext from React to pass property through all components inside AuthProvider with out using nested props

//Define the type of properties needed to use for the AuthContext
interface AuthContextType {
    currentUser: User | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    LogInUser: (email: string, password: string) => void;
    LogOutUser: () => Promise<void>;
    CreateUser: (email: string, password: string) => Promise<UserCredential>;
    isLogin: boolean | null;
    role: string;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
//Export useAuth so other component can use AuthProvider's properties
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

//define the type of children which are other React Component / ReactNode
interface Props {
    children?: React.ReactNode;
}

//AuthProvider component
const AuthProvider = ({ children }: Props) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const localRole = localStorage.getItem("role");
    const localIsLogin = localStorage.getItem("isLogin") == "true";
    const [role, setRole] = useState<string>(localRole ? localRole : "guest");
    const [isLogin, setLogin] = useState<boolean | null>(localIsLogin);
    const [isLoading, setLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    //Get current user and set login
    useLayoutEffect(() => {
        const unsubscribe = userStateListener((user) => {
            if (user) {
                setCurrentUser(user);
                setLogin(true);
                const docRef = doc(db, "user_infor", user.uid);
                getDoc(docRef).then((doc) => {
                    setRole(doc.data()?.["role"]);
                    localStorage.setItem("role", doc.data()?.["role"]);
                });
                localStorage.setItem("isLogin", "true");
            }
        });
        return unsubscribe;
    }, [currentUser]);

    //Auth function

    //Sign in User
    const LogInUser = async (email: string, password: string) => {
        if (!email || !password) return;
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password).then(
                (user) => {
                    setCurrentUser(user.user);
                    setLogin(true);
                    const docRef = doc(db, "users_ref", user.user.uid);
                    getDoc(docRef).then((doc) => {
                        setRole(doc.data()?.["role"]);
                        localStorage.setItem("role", doc.data()?.["role"]);
                    });
                    localStorage.setItem("isLogin", "true");
                }
            );
            navigate("/");
            window.location.reload();
        } catch (err) {
            alert("Wrong Email or Password");
        }
        setLoading(false);
    };

    //Sign out User
    const LogOutUser = async () => {
        await signOut(auth);
        localStorage.setItem("role", "guest");
        localStorage.setItem("isLogin", "false");
        navigate("/");
        window.location.reload();
    };

    //Create User
    const CreateUser = async (email: string, password: string) => {
        return createUserWithEmailAndPassword(secondary_auth, email, password);
    };

    //From Internet :))
    const userStateListener = (callback: NextOrObserver<User>) => {
        return onAuthStateChanged(auth, callback);
    };

    //Create an object contain properties for the AuthContext.Provider
    const value = {
        currentUser,
        setCurrentUser,
        LogInUser,
        LogOutUser,
        CreateUser,
        isLogin,
        role,
        isLoading,
    };

    //Return the Provider
    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

export default AuthProvider;
