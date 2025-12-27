import { Component, OnInit } from '@angular/core';
import { AuthService, AuthUser } from '../../shared/auth.service';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { EditGeneralInfoDialogComponent } from './edit-general-info-dialog/edit-general-info-dialog.component';

@Component({
  selector: 'app-general-info',
  templateUrl: './general-info.component.html',
  styleUrls: ['./general-info.component.css']
})
export class GeneralInfoComponent implements OnInit {
  user$: Observable<AuthUser | null>;
  
  constructor(
    private auth: AuthService,
    private dialog: MatDialog
  ) {
    this.user$ = this.auth.user$;
  }

  ngOnInit(): void {
    // No JSON loading needed - use fullAddressTh from backend
  }

  openEditDialog(user: AuthUser): void {
    const dialogRef = this.dialog.open(EditGeneralInfoDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: user,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && typeof result === 'object') {
        // Update user state directly with changes from dialog (instant, no API call)
        const currentUser = this.auth.currentUser;
        if (currentUser) {
          const updatedUser: AuthUser = {
            ...currentUser,
            sellerNameTh: result.sellerNameTh || currentUser.sellerNameTh,
            sellerNameEn: result.sellerNameEn || currentUser.sellerNameEn,
            sellerPhoneNumber: result.sellerPhoneNumber || currentUser.sellerPhoneNumber,
            logoUrl: result.logoUrl || currentUser.logoUrl
          };
          this.auth.setUser(updatedUser);
        }
      }
    });
  }

  /**
   * Use fullAddressTh from backend directly (pre-built address string)
   * This avoids loading 3 JSON files just to display address
   */
  getFormattedAddress(user: AuthUser): string {
    return user?.fullAddressTh && user.fullAddressTh.trim().length > 0 
      ? user.fullAddressTh 
      : '-';
  }
}

