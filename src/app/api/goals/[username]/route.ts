import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import { IGoal } from "@/models/Goals";
import { getServerSession } from "next-auth";
import { pinata } from "@/utils/pinataConfig";

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
    const { username } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return Response.json(
            {
                success: false,
                message: "User not authenticated"
            },
            {
                status: 401
            }
        );
    }
    if (!username) {
        return new Response(JSON.stringify({ success: false, error: "User id not provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await dbConnect();

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!user.goalsCID || user.goalsCID.length === 0) {
            return new Response(JSON.stringify({ success: true, goals: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        const cid = user.goalsCID[user.goalsCID.length - 1];
        const { data } = await pinata.gateways.get(`${cid}`);
        const goalsData = JSON.parse(data as string) as IGoal[];

        return new Response(JSON.stringify({ success: true, goals: goalsData }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function POST(request: Request, context: { params: Promise<{ username: string }> }) {
    const { username } = await context.params;
    const session = await getServerSession(authOptions);
    const newGoal = await request.json();

    if (!session || !session.user) {
        return Response.json(
            {
                success: false,
                message: "User not authenticated"
            },
            {
                status: 401
            }
        );
    }
    if (!username) {
        return new Response(JSON.stringify({ success: false, error: "User id not provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Validate goal data
    if (!newGoal.goalTitle || typeof newGoal.amount !== 'number' || typeof newGoal.remaining !== 'number') {
        return new Response(JSON.stringify({ 
            success: false, 
            error: "Invalid goal data. Required: goalTitle (string), amount (number), remaining (number)" 
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (newGoal.amount <= 0 || newGoal.remaining < 0) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: "Amount must be positive and remaining must be non-negative" 
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (newGoal.remaining > newGoal.amount) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: "Remaining amount cannot be greater than total amount" 
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await dbConnect();

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        let currentGoals: IGoal[] = [];
        if (user.goalsCID.length > 0) {
            const currentCid = user.goalsCID[user.goalsCID.length - 1];
            const { data } = await pinata.gateways.get(`${currentCid}`);
            currentGoals = JSON.parse(data as string) as IGoal[];
        }

        // Check if goal with same title already exists
        if (currentGoals.some((goal: IGoal) => goal.goalTitle === newGoal.goalTitle)) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: "A goal with this title already exists" 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const goalToSave: IGoal = {
            goalTitle: newGoal.goalTitle,
            amount: newGoal.amount,
            remaining: newGoal.remaining
        };

        currentGoals.push(goalToSave);

        // Upload updated goals to IPFS
        const goalsBlob = new Blob([JSON.stringify(currentGoals)], { type: 'application/json' });
        const goalsFile = new File([goalsBlob], 'goals.json', { type: 'application/json' });
        const goalsUpload = await pinata.upload.file(goalsFile);

        // Save CID to user
        user.goalsCID.push(goalsUpload.cid);
        await user.save();

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Goal created",
            goal: goalToSave,
            goals: currentGoals
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ username: string }> }) {
    const { username } = await context.params;
    const session = await getServerSession(authOptions);
    const { goalTitle } = await request.json();

    if (!session || !session.user) {
        return Response.json(
            {
                success: false,
                message: "User not authenticated"
            },
            {
                status: 401
            }
        );
    }
    if (!username) {
        return new Response(JSON.stringify({ success: false, error: "Username not provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (!goalTitle) {
        return new Response(JSON.stringify({ success: false, error: "Goal title not provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await dbConnect();

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        let currentGoals: IGoal[] = [];
        if (user.goalsCID.length > 0) {
            const currentCid = user.goalsCID[user.goalsCID.length - 1];
            const { data } = await pinata.gateways.get(`${currentCid}`);
            currentGoals = JSON.parse(data as string) as IGoal[];
        }

        const goalIndex = currentGoals.findIndex((goal: IGoal) => goal.goalTitle === goalTitle);
        if (goalIndex === -1) {
            return new Response(JSON.stringify({ success: false, error: "Goal not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        currentGoals.splice(goalIndex, 1);

        // Upload updated goals to IPFS
        const goalsBlob = new Blob([JSON.stringify(currentGoals)], { type: 'application/json' });
        const goalsFile = new File([goalsBlob], 'goals.json', { type: 'application/json' });
        const goalsUpload = await pinata.upload.file(goalsFile);

        // Save CID to user
        user.goalsCID.push(goalsUpload.cid);
        await user.save();

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Goal removed successfully" 
        }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ username: string }> }) {
    const { username } = await context.params;
    const session = await getServerSession(authOptions);
    const updatedGoal = await request.json();

    if (!session || !session.user) {
        return Response.json(
            {
                success: false,
                message: "User not authenticated"
            },
            {
                status: 401
            }
        );
    }
    if (!username) {
        return new Response(JSON.stringify({ success: false, error: "Username not provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Validate updated goal data
    if (!updatedGoal.goalTitle || typeof updatedGoal.amount !== 'number' || typeof updatedGoal.remaining !== 'number') {
        return new Response(JSON.stringify({ 
            success: false, 
            error: "Invalid goal data. Required: goalTitle (string), amount (number), remaining (number)" 
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (updatedGoal.amount <= 0 || updatedGoal.remaining < 0) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: "Amount must be positive and remaining must be non-negative" 
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (updatedGoal.remaining > updatedGoal.amount) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: "Remaining amount cannot be greater than total amount" 
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await dbConnect();

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        let currentGoals: IGoal[] = [];
        if (user.goalsCID.length > 0) {
            const currentCid = user.goalsCID[user.goalsCID.length - 1];
            const { data } = await pinata.gateways.get(`${currentCid}`);
            currentGoals = JSON.parse(data as string) as IGoal[];
        }

        const goalIndex = currentGoals.findIndex((goal: IGoal) => goal.goalTitle === updatedGoal.goalTitle);
        if (goalIndex === -1) {
            return new Response(JSON.stringify({ success: false, error: "Goal not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const goalToSave: IGoal = {
            goalTitle: updatedGoal.goalTitle,
            amount: updatedGoal.amount,
            remaining: updatedGoal.remaining
        };

        currentGoals[goalIndex] = goalToSave;

        // Upload updated goals to IPFS
        const goalsBlob = new Blob([JSON.stringify(currentGoals)], { type: 'application/json' });
        const goalsFile = new File([goalsBlob], 'goals.json', { type: 'application/json' });
        const goalsUpload = await pinata.upload.file(goalsFile);

        // Save CID to user
        user.goalsCID.push(goalsUpload.cid);
        await user.save();

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Goal updated successfully",
            goal: goalToSave,
            goals: currentGoals
        }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
        
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
