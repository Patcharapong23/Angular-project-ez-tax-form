import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BranchesListComponent } from './pages/branches-list/branches-list.component';
import { BranchesRoutingModule } from './branches-routing.module';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SharedModule } from '../../shared/shared.module';

import { BranchDialogComponent } from './dialogs/branch-dialog/branch-dialog.component';

import { DropdownModule } from 'primeng/dropdown';

@NgModule({
  declarations: [BranchesListComponent, BranchDialogComponent],
  imports: [
    CommonModule,
    BranchesRoutingModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    SharedModule,
    DropdownModule
  ],
  providers: [
    DatePipe
  ],
})
export class BranchesModule {}
