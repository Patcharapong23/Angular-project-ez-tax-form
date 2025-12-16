import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BuyersListComponent } from './pages/buyers-list/buyers-list.component';

const routes: Routes = [
  {
    path: '',
    component: BuyersListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BuyersRoutingModule { }
