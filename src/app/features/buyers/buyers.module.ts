import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BuyersListComponent } from './pages/buyers-list/buyers-list.component';
import { BuyersRoutingModule } from './buyers-routing.module';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select'; // Import MatSelectModule
import { ReactiveFormsModule } from '@angular/forms';
import { BuyerDialogComponent } from './dialogs/buyer-dialog/buyer-dialog.component';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [BuyersListComponent, BuyerDialogComponent],
  imports: [
    CommonModule,
    BuyersRoutingModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule, // Add MatSelectModule
    MatDatepickerModule,
    MatNativeDateModule,
    SharedModule
  ],
  providers: [
    DatePipe
  ],
})
export class BuyersModule {}
