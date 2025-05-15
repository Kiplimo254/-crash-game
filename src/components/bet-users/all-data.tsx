import React from "react"
import Context from "../../context";
import { BettedUserType } from "../../types/context";
// import { useCrashContext } from "../Main/context";

interface AllDataProps {
    pre: boolean
    setPre: React.Dispatch<React.SetStateAction<boolean>>
    allData: BettedUserType[]
}

const AllData: React.FC<AllDataProps> = ({ pre, setPre, allData }) => {
    const state = React.useContext(Context)
    // const [state] = useCrashContext();

    return (
        <div className="data-list">
            <div className="cdk-virtual-scroll-viewport">
                <div className="cdk-virtual-scroll-content-wrapper">
                    {allData?.map((user, key) => (
                        <div className={`bet-item ${user.cashouted ? "celebrated" : ""}`} key={key}>
                            <div className="user">
                                {user.img ?
                                    <img className="avatar" src={user.img} alt="avatar" /> :
                                    <img className="avatar" src="./avatars/av-5.png" alt="avatar" />
                                }
                                <div className="username">{user.name?.slice(0, 1) + "***" + user.name?.slice(-1)}</div>
                            </div>
                            <div className="bet">
                                {Number(user.betAmount).toFixed(2)}
                            </div>
                            {user.cashouted &&
                                <div className="multiplier-block">
                                    <div className="bubble">{Number(user.target).toFixed(2)}</div>
                                </div>
                            }
                            <div className="cash-out">{Number(user.cashOut) > 0 ? Number(user.cashOut).toFixed(2) : ""}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
};

export default AllData;