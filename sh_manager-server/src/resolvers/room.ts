import { Resolver, Query, Ctx, Int, Arg, Mutation } from "type-graphql";
import { Room } from "../entities/Room";
import { MyContext } from "../types";

@Resolver()
export class RoomResolver {
    @Query(() => [Room])
    rooms (@Ctx() {em}: MyContext): Promise<Room[]> {
        return em.find(Room, {})
    }

    @Query(() => Room, { nullable: true })
    room (
        @Arg('id', () => Int) id: number,
        @Ctx() {em}: MyContext
    ): Promise<Room | null> {
        return em.findOne(Room, { id });
    }

    @Mutation(() => Room)
    async createRoom (
        @Arg('name') name: string,
        @Arg('type') type: string,
        @Ctx() {em}: MyContext
    ): Promise<Room> {
        const room = em.create(Room, { name, type });
        await em.persistAndFlush(room);
        return room;
    }

    @Mutation(() => Room, { nullable: true })
    async updateRoom (
        @Arg('id') id: number,
        @Arg('name', () => String, { nullable: true }) name: string,
        @Arg('type', () => String, { nullable: true }) type: string,
        @Ctx() {em}: MyContext
    ): Promise<Room | null> {
        const room = await em.findOne(Room, {id});
        if (!room) {
            return null;            
        }
        if (name) room.name = name;
        if (type) room.type = type;

        await em.persistAndFlush(room);
        return room
    }

    @Mutation(() => Boolean)
    async deleteRoom (
        @Arg('id') id: number,
        @Ctx() {em}: MyContext
    ): Promise<boolean>{
        try {
            await em.nativeDelete(Room, {id});
            return true;
        } catch {
            return false;
        }
    }

}