import { Injectable } from '@angular/core';
import { BaseStoreService } from './base-store.service';
import { Buyer, BuyerService } from './buyer.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BuyerStoreService extends BaseStoreService<Buyer> {

  constructor(private buyerService: BuyerService) {
    super();
  }

  getBuyers$(sortBy?: string, sortDir?: string): Observable<Buyer[] | null> {
    return this.get$(() => this.buyerService.getBuyers(sortBy || 'updateDate', sortDir || 'desc'));
  }
}
