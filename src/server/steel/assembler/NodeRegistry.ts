import { Node3D } from '../domain/model';

export class NodeRegistry {
    private nodes: Node3D[] = [];
    private tolerance: number;
    private idCounter = 1;

    constructor(toleranceMm: number = 1.0) {
        this.tolerance = toleranceMm;
    }

    public registerOrGet(x: number, y: number, z: number): Node3D {
        const found = this.nodes.find(n => 
            Math.abs(n.x - x) <= this.tolerance &&
            Math.abs(n.y - y) <= this.tolerance &&
            Math.abs(n.z - z) <= this.tolerance
        );

        if (found) {
            return found;
        }

        const newNode: Node3D = {
            id: `N_${this.idCounter++}`,
            x,
            y,
            z
        };

        this.nodes.push(newNode);
        return newNode;
    }

    public getNodesRecord(): Record<string, Node3D> {
        const record: Record<string, Node3D> = {};
        this.nodes.forEach(n => record[n.id] = n);
        return record;
    }

    public getCount(): number {
        return this.nodes.length;
    }
}
