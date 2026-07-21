import { useState, useEffect } from "react";
import { API } from "../utils/constants";

import Sidebar from "./Sidebar";
import Header from "./Header";
import SuggestionCard from "./SuggestionCard";


export default function Cleanup() {
    const [userEmail, setUserEmail] = useState("");

    const [topOffender, setTopOffender] = useState(null);

    useEffect(()=> {
        fetch(`${API}/auth/me`)
        .then((r) => r.json())
        .then((data) => setUserEmail(data.email));
    }, []);

    useEffect(()=> {
        fetch(`${API}/suggestions/top-offender`)
        .then((r) => r.json())
        .then((data) => setTopOffender(data));
    }, []);
  
    return(
        <div className="min-h-screen flex bg-gray-50 text-gray-800 overflow-x-hidden">
            <Sidebar/>

            <div className="flex-1 flex flex-col">
                <Header userEmail={userEmail} />

                <main className="p-6 overflow-y-auto overflow-x-hidden">
                    {/* suggestion cards*/}
                    <div>
                        <div className="grid grid-cols-3 gap-4">
                            {topOffender ? (
                                <SuggestionCard suggestion={topOffender} />
                            ) : (
                                <p className="text-gray-400 text-sm">No top offender right now.</p>
                            )}
                        </div>
                    </div>
                    
                </main>

            </div>
        </div>
    );
}