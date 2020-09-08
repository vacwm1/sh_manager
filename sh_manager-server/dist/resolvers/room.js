"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomResolver = void 0;
const type_graphql_1 = require("type-graphql");
const Room_1 = require("../entities/Room");
let RoomResolver = class RoomResolver {
    rooms({ em }) {
        return em.find(Room_1.Room, {});
    }
    room(id, { em }) {
        return em.findOne(Room_1.Room, { id });
    }
    createRoom(name, type, { em }) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = em.create(Room_1.Room, { name, type });
            yield em.persistAndFlush(room);
            return room;
        });
    }
    updateRoom(id, name, type, { em }) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield em.findOne(Room_1.Room, { id });
            if (!room) {
                return null;
            }
            if (name)
                room.name = name;
            if (type)
                room.type = type;
            yield em.persistAndFlush(room);
            return room;
        });
    }
    deleteRoom(id, { em }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield em.nativeDelete(Room_1.Room, { id });
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
};
__decorate([
    type_graphql_1.Query(() => [Room_1.Room]),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RoomResolver.prototype, "rooms", null);
__decorate([
    type_graphql_1.Query(() => Room_1.Room, { nullable: true }),
    __param(0, type_graphql_1.Arg('id', () => type_graphql_1.Int)),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RoomResolver.prototype, "room", null);
__decorate([
    type_graphql_1.Mutation(() => Room_1.Room),
    __param(0, type_graphql_1.Arg('name')),
    __param(1, type_graphql_1.Arg('type')),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RoomResolver.prototype, "createRoom", null);
__decorate([
    type_graphql_1.Mutation(() => Room_1.Room, { nullable: true }),
    __param(0, type_graphql_1.Arg('id')),
    __param(1, type_graphql_1.Arg('name', () => String, { nullable: true })),
    __param(2, type_graphql_1.Arg('type', () => String, { nullable: true })),
    __param(3, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], RoomResolver.prototype, "updateRoom", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Arg('id')),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RoomResolver.prototype, "deleteRoom", null);
RoomResolver = __decorate([
    type_graphql_1.Resolver()
], RoomResolver);
exports.RoomResolver = RoomResolver;
//# sourceMappingURL=room.js.map